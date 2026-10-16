import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { search, module: modFilter, action: actFilter, status, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { userEmail: { contains: String(search), mode: 'insensitive' } },
        { action: { contains: String(search), mode: 'insensitive' } },
        { module: { contains: String(search), mode: 'insensitive' } },
        { details: { contains: String(search), mode: 'insensitive' } },
        { recordId: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (modFilter) {
      where.module = { equals: String(modFilter), mode: 'insensitive' };
    }

    if (actFilter) {
      where.action = { equals: String(actFilter), mode: 'insensitive' };
    }

    if (status) {
      where.status = String(status);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              email: true,
              employee: { select: { firstName: true, lastName: true } }
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return res.json({
      success: true,
      data: logs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('getAuditLogs error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

export const getAuditLogById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            employee: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!log) {
      return res.status(404).json({ error: 'Audit log entry not found' });
    }

    return res.json({ success: true, data: log });
  } catch (error) {
    console.error('getAuditLogById error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit log detail' });
  }
};

export const getLoginActivities = async (req: Request, res: Response) => {
  try {
    const { search, status, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(String(page), 10) || 1;
    const limitNum = parseInt(String(limit), 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: String(search), mode: 'insensitive' } },
        { ipAddress: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    if (status) {
      where.status = String(status);
    }

    const [activities, total] = await Promise.all([
      prisma.loginActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.loginActivity.count({ where })
    ]);

    return res.json({
      success: true,
      data: activities,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('getLoginActivities error:', error);
    return res.status(500).json({ error: 'Failed to fetch login activities' });
  }
};
