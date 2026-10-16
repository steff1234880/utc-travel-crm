import prisma from './prisma';
import { Request } from 'express';

export interface AuditLogParams {
  req?: Request;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  module: string;
  recordId?: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  status?: 'SUCCESS' | 'FAILURE' | 'FORBIDDEN';
  details?: string;
}

export const logAudit = async (params: AuditLogParams) => {
  try {
    // Check if audit logging is enabled in SecuritySettings
    const settings = await prisma.securitySettings.findUnique({ where: { id: 'default' } });
    if (settings && !settings.auditLoggingEnabled) {
      return;
    }

    const userId = params.userId || params.req?.user?.userId;
    const userEmail = params.userEmail || (params.req?.user as any)?.email;
    const userRole = params.userRole || (params.req?.user as any)?.roleName;
    const ipAddress = params.ipAddress || params.req?.ip || params.req?.headers['x-forwarded-for'] as string || '127.0.0.1';
    const userAgent = params.userAgent || params.req?.headers['user-agent'] || 'Unknown';

    const stringifyValue = (val: any) => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'string') return val;
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    };

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail || null,
        userRole: userRole || null,
        action: params.action,
        module: params.module,
        recordId: params.recordId || null,
        previousValue: stringifyValue(params.previousValue),
        newValue: stringifyValue(params.newValue),
        ipAddress: stringifyValue(ipAddress),
        userAgent: stringifyValue(userAgent),
        status: params.status || 'SUCCESS',
        details: params.details || null
      }
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
};

export const logLoginActivity = async (params: {
  userId?: string;
  email: string;
  status: string;
  req?: Request;
}) => {
  try {
    const ipAddress = params.req?.ip || params.req?.headers['x-forwarded-for'] as string || '127.0.0.1';
    const userAgent = params.req?.headers['user-agent'] || 'Unknown';

    await prisma.loginActivity.create({
      data: {
        userId: params.userId || null,
        email: params.email,
        status: params.status,
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : String(ipAddress),
        userAgent: String(userAgent)
      }
    });
  } catch (error) {
    console.error('Failed to log login activity:', error);
  }
};

export const logOperationsActivity = async (params: any) => {
  return logAudit({
    action: params.action || 'OPERATIONS_ACTIVITY',
    module: params.entity || 'Operations',
    recordId: params.entityId,
    details: params.details,
    userId: params.userId,
    userEmail: params.userEmail
  });
};

