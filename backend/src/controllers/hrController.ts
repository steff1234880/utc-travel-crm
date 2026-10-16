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
    const totalEmployees = await prisma.employee.count();
    const activeEmployees = await prisma.employee.count({ where: { status: 'ACTIVE' } });
    const departments = await prisma.department.count();
    
    // Recent activity or latest employees
    const recentEmployees = await prisma.employee.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { department: true, designation: true }
    });

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees: totalEmployees - activeEmployees,
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
    
    // Check if user or employee with email already exists
    let user = await prisma.user.findUnique({ where: { email: data.email } });
    if (user) {
      return res.status(400).json({ success: false, message: 'User or employee with this email address already exists' });
    }

    const rawPassword = data.password || 'Password@123';
    const validation = await validatePasswordStrength(rawPassword);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const passwordHash = await hashPassword(rawPassword);

    // Role Handling - find matching RBAC role by name or ID
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
      role = await prisma.role.create({
        data: {
          name: data.role,
          description: `Custom role for ${data.role}`
        }
      });
    }
    
    user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        roleId: role.id,
        isActive: data.status === 'ACTIVE'
      }
    });

    // Designation Handling
    let departmentId = data.departmentId;
    if (!departmentId) {
      let generalDept = await prisma.department.findUnique({ where: { name: 'General' } });
      if (!generalDept) {
        generalDept = await prisma.department.create({ data: { name: 'General' } });
      }
      departmentId = generalDept.id;
    }

    let designation = await prisma.designation.findFirst({ 
      where: { name: data.designation, departmentId } 
    });
    
    if (!designation) {
      designation = await prisma.designation.create({
        data: { name: data.designation, departmentId }
      });
    }

    const existingEmployee = await prisma.employee.findUnique({ where: { employeeId: data.employeeId } });
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: 'Employee ID already exists' });
    }

    const employee = await prisma.employee.create({
      data: {
        employeeId: data.employeeId,
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address,
        emergencyContact: data.emergencyContact,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
        status: data.status,
        employmentType: data.employmentType,
        departmentId: departmentId,
        designationId: designation.id,
        reportingManagerId: data.reportingManagerId,
        bankDetails: data.bankDetails
      },
      include: {
        department: true,
        designation: true,
        user: { select: { email: true, role: true } }
      }
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
    
    delete updateData.email;
    
    // Handle Role Update
    if (data.role) {
      let role = await prisma.role.findUnique({ where: { name: data.role } });
      if (!role) {
        role = await prisma.role.create({ data: { name: data.role } });
      }
      
      const employeeData = await prisma.employee.findUnique({ where: { id } });
      if (employeeData) {
        await prisma.user.update({
          where: { id: employeeData.userId },
          data: { roleId: role.id }
        });
      }
      delete updateData.role;
    }

    // Handle Designation Update
    if (data.designation) {
      let departmentId: string | null | undefined = data.departmentId;
      if (!departmentId) {
        const emp = await prisma.employee.findUnique({ where: { id } });
        departmentId = emp?.departmentId;
        if (!departmentId) {
          let generalDept = await prisma.department.findUnique({ where: { name: 'General' } });
          if (!generalDept) {
            generalDept = await prisma.department.create({ data: { name: 'General' } });
          }
          departmentId = generalDept.id;
        }
      }

      let designation = await prisma.designation.findFirst({ 
        where: { name: data.designation, departmentId } 
      });
      
      if (!designation) {
        designation = await prisma.designation.create({
          data: { name: data.designation, departmentId }
        });
      }
      updateData.designationId = designation.id;
      delete updateData.designation;
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: { department: true, designation: true }
    });

    res.status(200).json({ success: true, data: employee });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Failed to update employee', error });
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
    
    const existingEmployee = await prisma.employee.findUnique({ where: { id } });
    if (!existingEmployee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    await prisma.employee.update({
      where: { id },
      data: { status: 'DELETED' }
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
