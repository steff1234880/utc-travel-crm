import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logAudit } from '../utils/auditLogger';

export const getSecuritySettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.securitySettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.securitySettings.create({
        data: {
          id: 'default',
          passwordMinLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          sessionTimeoutMins: 120,
          maxLoginAttempts: 5,
          lockoutDurationMins: 15,
          auditLoggingEnabled: true,
          maxFileUploadMb: 10,
          allowedFileTypes: 'pdf,doc,docx,jpg,jpeg,png,webp,csv,xlsx'
        }
      });
    }

    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error('getSecuritySettings error:', error);
    return res.status(500).json({ error: 'Failed to fetch security settings' });
  }
};

export const updateSecuritySettings = async (req: Request, res: Response) => {
  try {
    const {
      passwordMinLength,
      requireUppercase,
      requireLowercase,
      requireNumbers,
      requireSpecialChars,
      sessionTimeoutMins,
      maxLoginAttempts,
      lockoutDurationMins,
      auditLoggingEnabled,
      maxFileUploadMb,
      allowedFileTypes
    } = req.body;

    const previousSettings = await prisma.securitySettings.findUnique({ where: { id: 'default' } });

    const updated = await prisma.securitySettings.upsert({
      where: { id: 'default' },
      update: {
        ...(passwordMinLength !== undefined && { passwordMinLength: Number(passwordMinLength) }),
        ...(requireUppercase !== undefined && { requireUppercase: Boolean(requireUppercase) }),
        ...(requireLowercase !== undefined && { requireLowercase: Boolean(requireLowercase) }),
        ...(requireNumbers !== undefined && { requireNumbers: Boolean(requireNumbers) }),
        ...(requireSpecialChars !== undefined && { requireSpecialChars: Boolean(requireSpecialChars) }),
        ...(sessionTimeoutMins !== undefined && { sessionTimeoutMins: Number(sessionTimeoutMins) }),
        ...(maxLoginAttempts !== undefined && { maxLoginAttempts: Number(maxLoginAttempts) }),
        ...(lockoutDurationMins !== undefined && { lockoutDurationMins: Number(lockoutDurationMins) }),
        ...(auditLoggingEnabled !== undefined && { auditLoggingEnabled: Boolean(auditLoggingEnabled) }),
        ...(maxFileUploadMb !== undefined && { maxFileUploadMb: Number(maxFileUploadMb) }),
        ...(allowedFileTypes !== undefined && { allowedFileTypes: String(allowedFileTypes) })
      },
      create: {
        id: 'default',
        passwordMinLength: Number(passwordMinLength || 8),
        requireUppercase: Boolean(requireUppercase ?? true),
        requireLowercase: Boolean(requireLowercase ?? true),
        requireNumbers: Boolean(requireNumbers ?? true),
        requireSpecialChars: Boolean(requireSpecialChars ?? true),
        sessionTimeoutMins: Number(sessionTimeoutMins || 120),
        maxLoginAttempts: Number(maxLoginAttempts || 5),
        lockoutDurationMins: Number(lockoutDurationMins || 15),
        auditLoggingEnabled: Boolean(auditLoggingEnabled ?? true),
        maxFileUploadMb: Number(maxFileUploadMb || 10),
        allowedFileTypes: String(allowedFileTypes || 'pdf,doc,docx,jpg,jpeg,png,webp,csv,xlsx')
      }
    });

    await logAudit({
      req,
      action: 'SECURITY_SETTINGS_UPDATE',
      module: 'System Settings',
      recordId: 'default',
      previousValue: previousSettings,
      newValue: updated,
      status: 'SUCCESS',
      details: 'Updated security configuration settings'
    });

    return res.json({ success: true, message: 'Security settings updated successfully', data: updated });
  } catch (error) {
    console.error('updateSecuritySettings error:', error);
    return res.status(500).json({ error: 'Failed to update security settings' });
  }
};
