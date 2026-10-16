import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.utils';
import prisma from '../utils/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      const payload = verifyAccessToken(token);

      if (payload) {
        try {
          // Verify user exists, isActive, and fetch permissions
          const dbUser = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
              role: {
                include: {
                  permissions: true
                }
              }
            }
          });

          if (!dbUser || !dbUser.isActive) {
            res.status(401).json({ error: 'Unauthorized: User account is inactive or not found' });
            return;
          }

          const permissions = dbUser.role?.permissions.map(p => p.name) || [];

          req.user = {
            userId: dbUser.id,
            email: dbUser.email,
            roleId: dbUser.roleId,
            roleName: dbUser.role?.name || 'User',
            permissions
          };

          return next();
        } catch (err) {
          console.error('Auth verification DB error:', err);
        }
      }
    }
  }

  res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
};

export const authenticate = authenticateJWT;

const isSuperAdminRole = (role: string): boolean => {
  const r = (role || '').toUpperCase().trim();
  return r.includes('SUPER') || r.includes('CEO') || r === 'ADMIN' || r === 'SUPER_ADMIN';
};

export const authorizeRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const userRole = req.user.roleName || '';
      const normalizedUserRole = userRole.toUpperCase().trim();
      const normalizedAllowed = allowedRoles.map(r => r.toUpperCase().trim());
      
      // Super Admin and Admin bypass role limits
      if (isSuperAdminRole(userRole) || normalizedAllowed.includes(normalizedUserRole)) {
        return next();
      }

      res.status(403).json({ error: `Forbidden: Access restricted to ${allowedRoles.join(', ')}` });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error during authorization' });
    }
  };
};

export const requirePermission = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const roleName = req.user.roleName || '';
      const permissions = req.user.permissions || [];

      // Super Admin and Admin bypass permission checks
      if (isSuperAdminRole(roleName)) {
        return next();
      }

      if (permissions.includes(permissionName)) {
        return next();
      }

      res.status(403).json({ 
        error: `Forbidden: Missing required permission '${permissionName}'`,
        requiredPermission: permissionName
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error during permission check' });
    }
  };
};

export const requireModuleAccess = (moduleName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const roleName = req.user.roleName || '';
      const permissions = req.user.permissions || [];

      if (isSuperAdminRole(roleName)) {
        return next();
      }

      const normalizedMod = moduleName.toLowerCase().replace(/\s+/g, '_');
      const hasAccess = permissions.some(p => p.startsWith(`${normalizedMod}:`));

      if (hasAccess) {
        return next();
      }

      res.status(403).json({ error: `Forbidden: Access to ${moduleName} module is restricted` });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error during module access check' });
    }
  };
};
