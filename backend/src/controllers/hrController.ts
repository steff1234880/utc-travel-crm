import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { hashPassword, validatePasswordStrength } from '../utils/password.utils';
import { logAudit } from '../utils/auditLogger';
import { 
  createEmployeeSchema, 
  updateEmployeeSchema,
  createDepartmentSchema,
  createDesignationSchema,
  updateDesignationSchema
} from '../validators/hrValidator';

// --- Dashboard ---
export const getHRStats = async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const totalEmployees = await prisma.employee.count({ where: { status: { not: 'DELETED' } } });
    const activeEmployees = await prisma.employee.count({ where: { status: 'ACTIVE' } });
    const inactiveEmployees = await prisma.employee.count({ 
      where: { 
        status: { notIn: ['ACTIVE', 'DELETED'] } 
      } 
    });
    const departments = await prisma.department.count();
    
    // Recent activity or latest employees (excluding deleted employees)
    const recentEmployees = await prisma.employee.findMany({
      where: { status: { not: 'DELETED' } },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { department: true, designation: true }
    });

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        departments,
        recentEmployees
      }
    });
  } catch (error) {
    console.error('Error fetching HR stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch HR statistics' });
  }
};

// --- Employees ---
export const createEmployee = async (req: Request, res: Response) => {
  try {
    const data = createEmployeeSchema.parse(req.body);
    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedEmployeeId = data.employeeId.trim();

    // Helper to detect auto-generated placeholder Employee records created on orphan User accounts
    const isPlaceholderMemberRecord = (emp: { firstName: string; lastName: string; employeeId: string }, email: string) => {
      const emailPrefix = email.split('@')[0].trim().split('.')[0]?.toLowerCase() || '';
      return (
        emp.lastName === 'Member' &&
        /^EMP\d{4,}$/.test(emp.employeeId) &&
        emp.firstName.trim().toLowerCase() === emailPrefix
      );
    };

    // 1. Validate password strength upfront before touching the database
    const rawPassword = data.password || 'Password@123';
    const validation = await validatePasswordStrength(rawPassword);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    // 2. Check if any User records with this email already exist (case-insensitive)
    const existingUsers = await prisma.user.findMany({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      include: { employee: true }
    });

    for (const u of existingUsers) {
      const emp = u.employee;
      const isPlaceholder = emp ? isPlaceholderMemberRecord(emp, u.email) : false;
      const isReusable = !emp || emp.status === 'DELETED' || isPlaceholder;

      if (isReusable) {
        // Release the email and employeeId on the deleted/orphan/placeholder record
        const timestamp = Date.now();
        await prisma.$transaction(async (tx) => {
          if (emp && (emp.status !== 'DELETED' || !emp.employeeId.startsWith('deleted_'))) {
            await tx.employee.update({
              where: { id: emp.id },
              data: {
                status: 'DELETED',
                employeeId: emp.employeeId.startsWith('deleted_')
                  ? emp.employeeId
                  : `deleted_${timestamp}_${emp.employeeId}`
              }
            });
          }
          await tx.user.update({
            where: { id: u.id },
            data: {
              email: u.email.startsWith('deleted_')
                ? u.email
                : `deleted_${timestamp}_${u.email}`,
              isActive: false
            }
          });
        });
      } else {
        return res.status(400).json({ success: false, message: 'User or employee with this email address already exists' });
      }
    }

    // 3. Check Employee ID uniqueness among non-deleted employees (case-insensitive)
    const existingEmployees = await prisma.employee.findMany({
      where: { employeeId: { equals: normalizedEmployeeId, mode: 'insensitive' } },
      include: { user: true }
    });

    for (const emp of existingEmployees) {
      const isPlaceholder = emp.user ? isPlaceholderMemberRecord(emp, emp.user.email) : false;
      if (emp.status === 'DELETED' || isPlaceholder) {
        // The previous employee with this ID was soft-deleted (or is an orphan placeholder).
        // Free up the employeeId (and associated user email if not yet anonymized) so the new employee can take it.
        const timestamp = Date.now();
        await prisma.$transaction(async (tx) => {
          await tx.employee.update({
            where: { id: emp.id },
            data: {
              status: 'DELETED',
              employeeId: emp.employeeId.startsWith('deleted_')
                ? emp.employeeId
                : `deleted_${timestamp}_${emp.employeeId}`
            }
          });
          if (emp.user && !emp.user.email.startsWith('deleted_')) {
            await tx.user.update({
              where: { id: emp.userId },
              data: {
                email: `deleted_${timestamp}_${emp.user.email}`,
                isActive: false
              }
            });
          }
        });
      } else {
        return res.status(400).json({ success: false, message: 'Employee ID already exists' });
      }
    }

    const passwordHash = await hashPassword(rawPassword);

    // 4. Create Role, User, Designation, and Employee atomically inside a transaction
    // so a failure at any step never leaves behind an orphaned User record.
    const { employee, user, role } = await prisma.$transaction(async (tx) => {
      // Role Handling - find matching RBAC role by name or ID
      let roleRecord = await tx.role.findFirst({
        where: {
          OR: [
            { name: data.role },
            { id: data.role },
            { name: { equals: data.role, mode: 'insensitive' } }
          ]
        }
      });

      if (!roleRecord) {
        roleRecord = await tx.role.create({
          data: {
            name: data.role,
            description: `Custom role for ${data.role}`
          }
        });
      }

      const userRecord = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          roleId: roleRecord.id,
          isActive: data.status === 'ACTIVE'
        }
      });

      // Designation Handling (Optional)
      let designationId: string | null = null;
      const departmentId = data.departmentId && data.departmentId.trim() !== '' ? data.departmentId : null;

      if (data.designation && data.designation.trim() !== '') {
        let targetDeptId = departmentId;
        if (!targetDeptId) {
          let generalDept = await tx.department.findUnique({ where: { name: 'General' } });
          if (!generalDept) {
            generalDept = await tx.department.create({ data: { name: 'General' } });
          }
          targetDeptId = generalDept.id;
        }

        let designation = await tx.designation.findFirst({
          where: { name: data.designation.trim(), departmentId: targetDeptId }
        });

        if (!designation) {
          designation = await tx.designation.create({
            data: { name: data.designation.trim(), departmentId: targetDeptId }
          });
        }
        designationId = designation.id;
      }

      const employeeRecord = await tx.employee.create({
        data: {
          employeeId: normalizedEmployeeId,
          userId: userRecord.id,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          address: data.address,
          emergencyContact: data.emergencyContact,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
          status: data.status,
          employmentType: data.employmentType,
          departmentId: departmentId,
          designationId: designationId,
          reportingManagerId: data.reportingManagerId && data.reportingManagerId.trim() !== '' ? data.reportingManagerId : null,
          bankDetails: data.bankDetails
        },
        include: {
          department: true,
          designation: true,
          user: { select: { email: true, role: true } }
        }
      });

      return { employee: employeeRecord, user: userRecord, role: roleRecord };
    });

    await logAudit({
      req,
      action: 'EMPLOYEE_CREATE',
      module: 'Employees',
      recordId: employee.id,
      newValue: { email: user.email, employeeId: employee.employeeId, role: role.name },
      status: 'SUCCESS',
      details: `Created employee and login user account for ${user.email}`
    });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    console.error('Create Employee Error:', error);
    res.status(400).json({ success: false, message: 'Failed to create employee', error: error instanceof Error ? error.message : error });
  }
};

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const { status, departmentId, search } = req.query;
    
    const where: any = {};
    if (status) {
      where.status = String(status);
    } else {
      where.status = { not: 'DELETED' };
    }
    if (departmentId) where.departmentId = String(departmentId);
    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { employeeId: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        department: true,
        designation: true,
        user: { select: { email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
};

export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        designation: true,
        user: { select: { email: true, role: true } },
        documents: true,
        salaryStructure: {
          include: { allowances: true, deductions: true }
        }
      }
    });

    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    
    // RBAC: Check if the requester is an HR/Admin or the employee themselves
    const role = req.user?.roleId ? await prisma.role.findUnique({ where: { id: req.user.roleId } }) : null;
    const isHR = role && ['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(role.name);
    const isSelf = employee.userId === req.user?.userId;

    if (!isHR && !isSelf) {
      // Basic profile only for peers
      const basicProfile = {
        id: employee.id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        profilePhoto: employee.profilePhoto,
        department: employee.department,
        designation: employee.designation,
        status: employee.status,
        email: employee.user?.email || ''
      };
      return res.status(200).json({ success: true, data: basicProfile });
    }

    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch employee details' });
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = updateEmployeeSchema.parse(req.body);
    
    const updateData: any = { ...data };
    if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
    if (data.joiningDate) updateData.joiningDate = new Date(data.joiningDate);
    if (updateData.employeeId && typeof updateData.employeeId === 'string') {
      updateData.employeeId = updateData.employeeId.trim();
      const conflictingEmployees = await prisma.employee.findMany({
        where: {
          employeeId: { equals: updateData.employeeId, mode: 'insensitive' },
          id: { not: id }
        },
        include: { user: true }
      });
      for (const emp of conflictingEmployees) {
        const emailPrefix = emp.user?.email.split('@')[0].trim().split('.')[0]?.toLowerCase() || '';
        const isPlaceholder =
          emp.lastName === 'Member' &&
          /^EMP\d{4,}$/.test(emp.employeeId) &&
          emp.firstName.trim().toLowerCase() === emailPrefix;
        if (emp.status === 'DELETED' || isPlaceholder) {
          const timestamp = Date.now();
          await prisma.employee.update({
            where: { id: emp.id },
            data: {
              status: 'DELETED',
              employeeId: emp.employeeId.startsWith('deleted_')
                ? emp.employeeId
                : `deleted_${timestamp}_${emp.employeeId}`
            }
          });
        } else {
          return res.status(400).json({ success: false, message: 'Employee ID already exists' });
        }
      }
    }
    
    delete updateData.email;
    delete updateData.password;
    delete updateData.confirmPassword;

    // Handle foreign key nullification if empty string passed
    if (updateData.departmentId === '') updateData.departmentId = null;
    if (updateData.designationId === '') updateData.designationId = null;
    if (updateData.reportingManagerId === '') updateData.reportingManagerId = null;
    
    // Handle Role Update
    if (data.role && data.role.trim() !== '') {
      let role = await prisma.role.findFirst({
        where: {
          OR: [
            { name: data.role },
            { id: data.role },
            { name: { equals: data.role, mode: 'insensitive' } }
          ]
        }
      });
      if (!role) {
        role = await prisma.role.create({ data: { name: data.role, description: `Custom role for ${data.role}` } });
      }
      
      const employeeData = await prisma.employee.findUnique({ where: { id } });
      if (employeeData) {
        await prisma.user.update({
          where: { id: employeeData.userId },
          data: { roleId: role.id }
        });
      }
    }
    delete updateData.role;

    // Handle Designation Update
    if (data.designation && data.designation.trim() !== '') {
      let targetDeptId: string | null | undefined = updateData.departmentId !== undefined ? updateData.departmentId : undefined;
      if (!targetDeptId) {
        const emp = await prisma.employee.findUnique({ where: { id } });
        targetDeptId = emp?.departmentId;
        if (!targetDeptId) {
          let generalDept = await prisma.department.findUnique({ where: { name: 'General' } });
          if (!generalDept) {
            generalDept = await prisma.department.create({ data: { name: 'General' } });
          }
          targetDeptId = generalDept.id;
        }
      }

      let designation = await prisma.designation.findFirst({ 
        where: { name: data.designation.trim(), departmentId: targetDeptId } 
      });
      
      if (!designation) {
        designation = await prisma.designation.create({
          data: { name: data.designation.trim(), departmentId: targetDeptId }
        });
      }
      updateData.designationId = designation.id;
    }
    delete updateData.designation;

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: { department: true, designation: true }
    });

    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    console.error('Update Employee Error:', error);
    res.status(400).json({ success: false, message: 'Failed to update employee', error: error instanceof Error ? error.message : error });
  }
};

// --- Departments ---
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: { 
        _count: { 
          select: { 
            employees: { where: { status: { not: 'DELETED' } } } 
          } 
        },
        designations: true 
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const data = createDepartmentSchema.parse(req.body);
    const dept = await prisma.department.create({ data });
    res.status(201).json({ success: true, data: dept });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to create department' });
  }
};

export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, description } = req.body;
    const dept = await prisma.department.update({
      where: { id },
      data: { name, description }
    });
    res.status(200).json({ success: true, data: dept });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to update department' });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const dept = await prisma.department.findUnique({
      where: { id },
      include: { 
        _count: { 
          select: { 
            employees: { where: { status: { not: 'DELETED' } } } 
          } 
        } 
      }
    });

    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    if (dept._count.employees > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete department that has assigned employees' });
    }

    await prisma.department.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete department' });
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const existingEmployee = await prisma.employee.findUnique({ 
      where: { id },
      include: { user: true }
    });
    if (!existingEmployee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const timestamp = Date.now();
    const releasedEmployeeId = existingEmployee.employeeId.startsWith('deleted_')
      ? existingEmployee.employeeId
      : `deleted_${timestamp}_${existingEmployee.employeeId}`;

    await prisma.$transaction(async (tx) => {
      // 1. Soft-delete employee and release employeeId so it can be reused immediately
      await tx.employee.update({
        where: { id },
        data: { 
          status: 'DELETED',
          employeeId: releasedEmployeeId
        }
      });

      // 2. Anonymize user email and deactivate account to free up the email for reuse
      if (existingEmployee.userId) {
        const currentEmail = existingEmployee.user?.email || existingEmployee.userId;
        const anonymizedEmail = currentEmail.startsWith('deleted_')
          ? currentEmail
          : `deleted_${timestamp}_${currentEmail}`;
        await tx.user.update({
          where: { id: existingEmployee.userId },
          data: { 
            email: anonymizedEmail,
            isActive: false 
          }
        });
      }
    });

    await logAudit({
      req,
      action: 'EMPLOYEE_DELETE',
      module: 'Employees',
      recordId: id,
      previousValue: { 
        employeeId: existingEmployee.employeeId, 
        email: existingEmployee.user?.email,
        status: existingEmployee.status 
      },
      newValue: { status: 'DELETED' },
      status: 'SUCCESS',
      details: `Deleted employee ${existingEmployee.employeeId} (${existingEmployee.firstName} ${existingEmployee.lastName})`
    });

    res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, message: 'Failed to delete employee' });
  }
};

export const getDesignations = async (req: Request, res: Response) => {
  try {
    const { departmentId, isActive, search } = req.query;
    
    const where: any = {};
    if (departmentId) where.departmentId = String(departmentId);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.name = { contains: String(search), mode: 'insensitive' };
    }

    const designations = await prisma.designation.findMany({
      where,
      include: {
        department: true,
        _count: { 
          select: { 
            employees: { where: { status: { not: 'DELETED' } } } 
          } 
        }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({ success: true, data: designations });
  } catch (error) {
    console.error('Get designations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch designations' });
  }
};

export const createDesignation = async (req: Request, res: Response) => {
  try {
    const data = createDesignationSchema.parse(req.body);
    const desig = await prisma.designation.create({ 
      data,
      include: {
        department: true,
        _count: { 
          select: { 
            employees: { where: { status: { not: 'DELETED' } } } 
          } 
        }
      }
    });
    res.status(201).json({ success: true, data: desig });
  } catch (error) {
    console.error('Create designation error:', error);
    res.status(400).json({ success: false, message: 'Failed to create designation' });
  }
};

export const updateDesignation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = updateDesignationSchema.parse(req.body);

    const desig = await prisma.designation.update({
      where: { id },
      data,
      include: {
        department: true,
        _count: { 
          select: { 
            employees: { where: { status: { not: 'DELETED' } } } 
          } 
        }
      }
    });

    res.status(200).json({ success: true, data: desig });
  } catch (error) {
    console.error('Update designation error:', error);
    res.status(400).json({ success: false, message: 'Failed to update designation' });
  }
};

export const deleteDesignation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const desig = await prisma.designation.findUnique({
      where: { id },
      include: { 
        _count: { 
          select: { 
            employees: { where: { status: { not: 'DELETED' } } } 
          } 
        } 
      }
    });

    if (!desig) {
      return res.status(404).json({ success: false, message: 'Designation not found' });
    }

    if (desig._count.employees > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete designation that has assigned employees' });
    }

    await prisma.designation.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Designation deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete designation' });
  }
};
