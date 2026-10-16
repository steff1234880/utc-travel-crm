import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.utils';
import { comparePassword, hashPassword, validatePasswordStrength } from '../utils/password.utils';
import { logAudit, logLoginActivity } from '../utils/auditLogger';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: true
          }
        },
        employee: true
      }
    });

    if (!user) {
      await logLoginActivity({ email, status: 'FAILED_USER_NOT_FOUND', req });
      await logAudit({ req, action: 'FAILED_LOGIN', module: 'Auth', userEmail: email, status: 'FAILURE', details: 'User not found' });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      await logLoginActivity({ userId: user.id, email, status: 'FAILED_INVALID_PASSWORD', req });
      await logAudit({ req, userId: user.id, userEmail: email, action: 'FAILED_LOGIN', module: 'Auth', status: 'FAILURE', details: 'Invalid password' });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      await logLoginActivity({ userId: user.id, email, status: 'FAILED_DEACTIVATED', req });
      await logAudit({ req, userId: user.id, userEmail: email, action: 'FAILED_LOGIN', module: 'Auth', status: 'FORBIDDEN', details: 'Account is deactivated' });
      return res.status(403).json({ error: 'Account is deactivated. Please contact your administrator.' });
    }

    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const roleName = user.role?.name || 'User';
    const permissions = user.role?.permissions.map(p => p.name) || [];

    const payload = {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName,
      permissions
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await logLoginActivity({ userId: user.id, email: user.email, status: 'SUCCESS', req });
    await logAudit({
      req,
      userId: user.id,
      userEmail: user.email,
      userRole: roleName,
      action: 'LOGIN',
      module: 'Auth',
      status: 'SUCCESS',
      details: 'User logged in successfully'
    });

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName,
        permissions,
        employee: user.employee ? {
          id: user.employee.id,
          employeeId: user.employee.employeeId,
          firstName: user.employee.firstName,
          lastName: user.employee.lastName
        } : null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    if (req.user) {
      await logAudit({
        req,
        action: 'LOGOUT',
        module: 'Auth',
        status: 'SUCCESS',
        details: 'User logged out'
      });
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process logout' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: {
              select: {
                id: true,
                name: true,
                module: true,
                action: true
              }
            }
          }
        },
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
            designation: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permissions = user.role?.permissions.map(p => p.name) || [];

    return res.json({
      success: true,
      user: {
        ...user,
        roleName: user.role?.name || 'User',
        permissions
      }
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ error: 'Failed to fetch current user profile' });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      await logAudit({ req, action: 'PASSWORD_UPDATE_FAILED', module: 'Auth', status: 'FAILURE', details: 'Incorrect current password' });
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const validation = await validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.message });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    await logAudit({ req, action: 'PASSWORD_UPDATE', module: 'Auth', status: 'SUCCESS', details: 'Password updated successfully' });

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    return res.status(500).json({ error: 'Failed to update password' });
  }
};

export const register = async (req: Request, res: Response) => {
  return res.status(400).json({ error: 'User registration must be performed by an administrator via User Management' });
};

export const setupAdmin = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Password confirmation does not match' });
    }

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'A user account with this email address already exists' });
    }

    // Validate password strength
    const validation = await validatePasswordStrength(password);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.message });
    }

    // Hash password securely with bcrypt
    const passwordHash = await hashPassword(password);

    // Find or assign Admin role with all permissions
    let role = await prisma.role.findFirst({
      where: {
        OR: [
          { name: 'Admin' },
          { name: 'CEO / Super Admin' },
          { name: 'ADMIN' }
        ]
      }
    });

    const allPermissions = await prisma.permission.findMany({ select: { id: true } });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: 'Admin',
          description: 'Full Administrator Access',
          permissions: {
            connect: allPermissions.map(p => ({ id: p.id }))
          }
        }
      });
    } else {
      // Connect all permissions if not already attached
      await prisma.role.update({
        where: { id: role.id },
        data: {
          permissions: {
            set: allPermissions.map(p => ({ id: p.id }))
          }
        }
      });
    }

    // Create User in PostgreSQL DB
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        roleId: role.id,
        isActive: true
      }
    });

    // Create linked Employee record
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    const empCount = await prisma.employee.count();
    const empId = `ADM${String(empCount + 1).padStart(4, '0')}`;

    await prisma.employee.create({
      data: {
        userId: user.id,
        employeeId: empId,
        firstName,
        lastName,
        joiningDate: new Date()
      }
    });

    await logAudit({
      req,
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_SETUP',
      module: 'Auth',
      status: 'SUCCESS',
      details: `Admin account created for ${user.email}`
    });

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully. You may now log in.',
      data: {
        id: user.id,
        email: user.email,
        role: role.name
      }
    });
  } catch (error: any) {
    console.error('setupAdmin error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create Admin account' });
  }
};
