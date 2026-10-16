import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { hashPassword, validatePasswordStrength } from '../utils/password.utils';
import { logAudit } from '../utils/auditLogger';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { search, roleId, status, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: String(search), mode: 'insensitive' } },
        { employee: { firstName: { contains: String(search), mode: 'insensitive' } } },
        { employee: { lastName: { contains: String(search), mode: 'insensitive' } } }
      ];
    }

    if (roleId) {
      where.roleId = String(roleId);
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              department: { select: { name: true } },
              designation: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.user.count({ where })
    ]);

    return res.json({
      success: true,
      data: users,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: {
              select: { id: true, name: true, module: true, action: true }
            }
          }
        },
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            joiningDate: true,
            department: { select: { id: true, name: true } },
            designation: { select: { id: true, name: true } }
          }
        },
        loginActivities: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        auditLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('getUserById error:', error);
    return res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, roleId, firstName, lastName } = createUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const validation = await validatePasswordStrength(password);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.message });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        roleId: roleId || null,
        isActive: true
      },
      include: {
        role: true
      }
    });

    // Optionally create linked Employee record if name provided
    if (firstName && lastName) {
      const empCount = await prisma.employee.count();
      const empId = `EMP${String(empCount + 1).padStart(4, '0')}`;
      await prisma.employee.create({
        data: {
          userId: user.id,
          employeeId: empId,
          firstName,
          lastName,
          joiningDate: new Date()
        }
      });
    }

    await logAudit({
      req,
      action: 'USER_CREATE',
      module: 'User Management',
      recordId: user.id,
      newValue: { email: user.email, role: user.role?.name },
      status: 'SUCCESS',
      details: `Created user account for ${user.email}`
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: user.id, email: user.email, roleId: user.roleId }
    });
  } catch (error: any) {
    console.error('createUser error:', error);
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input parameters', details: error.errors });
    }
    return res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { email, roleId, isActive } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData: any = {};
    if (email && email !== existingUser.email) updateData.email = email;
    if (roleId !== undefined) updateData.roleId = roleId;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true }
    });

    await logAudit({
      req,
      action: 'USER_UPDATE',
      module: 'User Management',
      recordId: id,
      previousValue: { email: existingUser.email, roleId: existingUser.roleId, isActive: existingUser.isActive },
      newValue: { email: updatedUser.email, roleId: updatedUser.roleId, isActive: updatedUser.isActive },
      status: 'SUCCESS',
      details: `Updated user profile for ${updatedUser.email}`
    });

    return res.json({ success: true, message: 'User updated successfully', data: updatedUser });
  } catch (error) {
    console.error('updateUser error:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { isActive } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: Boolean(isActive) }
    });

    await logAudit({
      req,
      action: isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
      module: 'User Management',
      recordId: id,
      previousValue: { isActive: user.isActive },
      newValue: { isActive: updated.isActive },
      status: 'SUCCESS',
      details: `${isActive ? 'Activated' : 'Deactivated'} user ${user.email}`
    });

    return res.json({
      success: true,
      message: `User ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated
    });
  } catch (error) {
    console.error('toggleUserStatus error:', error);
    return res.status(500).json({ error: 'Failed to toggle user status' });
  }
};

export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validation = await validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.message });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });

    await logAudit({
      req,
      action: 'ADMIN_RESET_PASSWORD',
      module: 'User Management',
      recordId: id,
      status: 'SUCCESS',
      details: `Reset password for user ${user.email}`
    });

    return res.json({ success: true, message: `Password reset successfully for ${user.email}` });
  } catch (error) {
    console.error('resetUserPassword error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
};
