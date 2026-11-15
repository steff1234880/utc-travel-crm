import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import {
  assignLeadAutomatically,
  assignLeadManually,
  getEligibleSalesExecutives,
  getAssignmentOverview,
  getLeadAssignmentHistory,
  setAutoAssignmentSetting
} from '../services/leadAssignmentService';

const createLeadSchema = z.object({
  title: z.string().min(2),
  source: z.string().min(1),
  status: z.string().optional(),
  expectedValue: z.number().optional(),
  priority: z.string().optional(),
  customerId: z.string().uuid(),
  pipelineStageId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  enquiryId: z.string().uuid().optional(),
  destination: z.string().optional(),
  pipelineStage: z.string().optional()
});

export interface LeadAccessContext {
  roleName: string;
  normalizedRole: string;
  isSuperOrAdmin: boolean;
  isSalesManager: boolean;
  isSalesExecutive: boolean;
  isOwnLeadsOnlyRole: boolean;
  employeeId: string | null;
}

export async function getLeadAccessContext(req: Request): Promise<LeadAccessContext> {
  let roleName = req.user?.roleName || '';
  if (!roleName && req.user?.roleId) {
    const userRole = await prisma.role.findUnique({ where: { id: req.user.roleId } });
    roleName = userRole?.name || '';
  }

  const normalizedRole = roleName.toUpperCase().trim().replace(/[\s_-]+/g, '_');

  const isSuperOrAdmin =
    normalizedRole === 'ADMIN' ||
    normalizedRole === 'SUPER_ADMIN' ||
    normalizedRole === 'CEO_/_SUPER_ADMIN' ||
    normalizedRole.includes('SUPER') ||
    normalizedRole.includes('CEO');

  const isSalesManager =
    !isSuperOrAdmin &&
    (normalizedRole === 'SALES_MANAGER' || roleName.toLowerCase().trim() === 'sales manager');

  const isSalesExecutive =
    !isSuperOrAdmin &&
    !isSalesManager &&
    (normalizedRole === 'SALES_EXECUTIVE' || roleName.toLowerCase().trim() === 'sales executive');

  const isOwnLeadsOnlyRole = !isSuperOrAdmin && (isSalesManager || isSalesExecutive);

  let employeeId: string | null = null;
  if (req.user?.userId) {
    const employee = await prisma.employee.findUnique({
      where: { userId: req.user.userId },
      select: { id: true }
    });
    employeeId = employee?.id || null;
  }

  return {
    roleName,
    normalizedRole,
    isSuperOrAdmin,
    isSalesManager,
    isSalesExecutive,
    isOwnLeadsOnlyRole,
    employeeId
  };
}

export async function verifyLeadOwnership(
  leadId: string,
  req: Request
): Promise<{
  allowed: boolean;
  statusCode: number;
  error?: string;
  lead?: any;
  context: LeadAccessContext;
}> {
  const context = await getLeadAccessContext(req);
  const lead = await prisma.salesLead.findUnique({
    where: { id: leadId }
  });

  if (!lead) {
    return {
      allowed: false,
      statusCode: 404,
      error: 'Lead not found',
      context
    };
  }

  if (context.isSuperOrAdmin) {
    return {
      allowed: true,
      statusCode: 200,
      lead,
      context
    };
  }

  if (context.isOwnLeadsOnlyRole) {
    if (!context.employeeId || !lead.assignedToId || lead.assignedToId !== context.employeeId) {
      return {
        allowed: false,
        statusCode: 403,
        error: 'Access denied: You can only view and manage leads assigned to you.',
        lead,
        context
      };
    }
  }

  return {
    allowed: true,
    statusCode: 200,
    lead,
    context
  };
}

export const getLeads = async (req: Request, res: Response) => {
  try {
    const { status, pipelineStageId, assignedToId } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (pipelineStageId) where.pipelineStageId = String(pipelineStageId);
    if (assignedToId) where.assignedToId = String(assignedToId);

    // Sales Executives and Sales Managers can only open and view their own assigned leads
    const access = await getLeadAccessContext(req);
    if (access.isOwnLeadsOnlyRole) {
      where.assignedToId = access.employeeId || '__NO_ASSIGNED_LEADS__';
    }

    const leads = await prisma.salesLead.findMany({
      where,
      include: {
        customer: true,
        pipelineStage: true,
        assignedTo: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch leads' });
  }
};

export const getLeadById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ownership = await verifyLeadOwnership(id, req);
    if (!ownership.allowed) {
      return res.status(ownership.statusCode).json({ success: false, error: ownership.error });
    }

    const lead = await prisma.salesLead.findUnique({
      where: { id },
      include: {
        customer: true,
        pipelineStage: true,
        assignedTo: {
          include: {
            designation: true,
            user: {
              select: {
                email: true,
                role: { select: { name: true } }
              }
            }
          }
        },
        requirements: true,
        quotations: true,
        activities: { include: { employee: true }, orderBy: { createdAt: 'desc' } }
      }
    });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    const orConditions: any[] = [ { salesLeadId: lead.id } ];
    if (lead.enquiryId) {
      orConditions.push({ enquiryId: lead.enquiryId });
    }
    if (lead.customerId) {
      orConditions.push({ 
        customerId: lead.customerId,
        salesLeadId: null,
        enquiryId: null
      });
    }

    const followUps = await prisma.followUp.findMany({
      where: { OR: orConditions },
      include: { employee: true },
      orderBy: { scheduledFor: 'asc' }
    });

    res.json({ success: true, data: { ...lead, followUps } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch lead' });
  }
};

export const createLead = async (req: Request, res: Response) => {
  try {
    const data = createLeadSchema.parse(req.body);
    const { destination, pipelineStage, ...leadData } = data;
    
    let actualPipelineStageId = leadData.pipelineStageId;
    
    if (pipelineStage && !actualPipelineStageId) {
      const stage = await prisma.salesPipelineStage.findUnique({ where: { name: pipelineStage } });
      if (stage) {
        actualPipelineStageId = stage.id;
      }
    }

    if (leadData.assignedToId) {
      const targetEmployee = await prisma.employee.findUnique({
        where: { id: leadData.assignedToId },
        include: { user: true }
      });
      if (!targetEmployee || targetEmployee.status !== 'ACTIVE' || targetEmployee.user?.isActive === false) {
        return res.status(400).json({ success: false, error: 'Cannot assign lead to an inactive or deleted employee' });
      }
    }
    
    const lead = await prisma.salesLead.create({ 
      data: {
        ...leadData,
        assignmentType: leadData.assignedToId ? 'MANUAL' : 'UNASSIGNED',
        assignedAt: leadData.assignedToId ? new Date() : null,
        pipelineStageId: actualPipelineStageId,
        requirements: destination ? {
          create: {
            destination
          }
        } : undefined
      },
      include: { customer: true, pipelineStage: true, assignedTo: true, requirements: true }
    });

    // If an employee was manually specified during creation, log the manual assignment and sync enquiry if linked
    if (leadData.assignedToId) {
      await prisma.leadAssignmentHistory.create({
        data: {
          salesLeadId: lead.id,
          assignedToId: leadData.assignedToId,
          assignedById: req.user?.userId || null,
          assignmentType: 'MANUAL',
          reason: 'Manually assigned upon lead creation'
        }
      });

      if (lead.enquiryId) {
        await prisma.enquiryAssignment.deleteMany({ where: { enquiryId: lead.enquiryId } });
        await prisma.enquiryAssignment.create({
          data: {
            enquiryId: lead.enquiryId,
            employeeId: leadData.assignedToId
          }
        });
      }

      res.status(201).json({ success: true, data: lead });
    } else {
      // Trigger automatic assignment engine
      const assignResult = await assignLeadAutomatically(lead.id);
      res.status(201).json({ success: true, data: assignResult.lead, assignment: assignResult });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: 'Failed to create lead', details: error });
  }
};

export const updateLeadStage = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { pipelineStageId } = req.body;
    
    if (!pipelineStageId) return res.status(400).json({ success: false, error: 'pipelineStageId is required' });

    const ownership = await verifyLeadOwnership(id, req);
    if (!ownership.allowed) {
      return res.status(ownership.statusCode).json({ success: false, error: ownership.error });
    }

    const lead = await prisma.salesLead.update({
      where: { id },
      data: { pipelineStageId },
      include: { pipelineStage: true }
    });
    
    // Log activity
    const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
    if (employee) {
      await prisma.salesActivity.create({
        data: {
          salesLeadId: id,
          employeeId: employee.id,
          action: 'STAGE_CHANGED',
          description: `Moved to stage ${lead.pipelineStage?.name}`
        }
      });
    }

    if (lead.pipelineStage?.name === 'Won') {
      const existingWonLog = await prisma.auditLog.findFirst({
        where: { recordId: id, action: 'LEAD_WON' }
      });
      if (!existingWonLog) {
        await prisma.auditLog.create({
          data: {
            userId: req.user!.userId,
            userEmail: req.user!.email || 'system',
            action: 'LEAD_WON',
            module: 'CRM',
            recordId: id,
            details: `Lead stage changed to Won`
          }
        });
      }
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Failed to update lead stage' });
  }
};

const createFollowUpSchema = z.object({
  type: z.string().min(1),
  notes: z.string().optional(),
  scheduledFor: z.string(),
  status: z.string().optional()
});

const updateFollowUpSchema = z.object({
  type: z.string().optional(),
  notes: z.string().optional(),
  scheduledFor: z.string().optional(),
  status: z.string().optional()
});

export const createFollowUp = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string; // lead ID
    const ownership = await verifyLeadOwnership(id, req);
    if (!ownership.allowed) {
      return res.status(ownership.statusCode).json({ success: false, error: ownership.error });
    }

    const data = createFollowUpSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { employee: true }
    });

    if (!user?.employee) {
      return res.status(400).json({ success: false, error: 'User has no associated employee record' });
    }

    const followUp = await prisma.followUp.create({
      data: {
        salesLeadId: id,
        type: data.type,
        notes: data.notes,
        scheduledFor: new Date(data.scheduledFor),
        status: data.status || 'PENDING',
        employeeId: user.employee.id
      },
      include: { employee: true }
    });

    res.status(201).json({ success: true, data: followUp });
  } catch (error) {
    console.error('Failed to create follow-up:', error);
    res.status(500).json({ success: false, error: 'Failed to create follow-up' });
  }
};

export const updateFollowUp = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const followUpId = req.params.followUpId as string;

    const existingFollowUp = await prisma.followUp.findUnique({ where: { id: followUpId } });
    if (!existingFollowUp) {
      return res.status(404).json({ success: false, error: 'Follow-up not found' });
    }

    const targetLeadId = existingFollowUp.salesLeadId || id;
    if (targetLeadId) {
      const ownership = await verifyLeadOwnership(targetLeadId, req);
      if (!ownership.allowed) {
        return res.status(ownership.statusCode).json({ success: false, error: ownership.error });
      }
    }

    const data = updateFollowUpSchema.parse(req.body);

    const updateData: any = { ...data };
    if (data.scheduledFor) {
      updateData.scheduledFor = new Date(data.scheduledFor);
    }

    const followUp = await prisma.followUp.update({
      where: { id: followUpId },
      data: updateData,
      include: { employee: true }
    });

    res.json({ success: true, data: followUp });
  } catch (error) {
    console.error('Failed to update follow-up:', error);
    res.status(500).json({ success: false, error: 'Failed to update follow-up' });
  }
};

export const deleteFollowUp = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const followUpId = req.params.followUpId as string;

    const existingFollowUp = await prisma.followUp.findUnique({ where: { id: followUpId } });
    if (!existingFollowUp) {
      return res.status(404).json({ success: false, error: 'Follow-up not found' });
    }

    const targetLeadId = existingFollowUp.salesLeadId || id;
    if (targetLeadId) {
      const ownership = await verifyLeadOwnership(targetLeadId, req);
      if (!ownership.allowed) {
        return res.status(ownership.statusCode).json({ success: false, error: ownership.error });
      }
    }

    await prisma.followUp.delete({
      where: { id: followUpId }
    });
    res.json({ success: true, message: 'Follow-up deleted successfully' });
  } catch (error) {
    console.error('Failed to delete follow-up:', error);
    res.status(500).json({ success: false, error: 'Failed to delete follow-up' });
  }
};

const updateLeadSchema = z.object({
  title: z.string().min(2).optional(),
  source: z.string().min(1).optional(),
  pipelineStage: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional()
});

export const updateLead = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ownership = await verifyLeadOwnership(id, req);
    if (!ownership.allowed) {
      return res.status(ownership.statusCode).json({ success: false, error: ownership.error });
    }

    const data = updateLeadSchema.parse(req.body);

    const existingLead = await prisma.salesLead.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!existingLead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    let actualPipelineStageId = existingLead.pipelineStageId;
    if (data.pipelineStage) {
      const stage = await prisma.salesPipelineStage.findUnique({ where: { name: data.pipelineStage } });
      if (stage) actualPipelineStageId = stage.id;
    }

    const updatedLead = await prisma.$transaction(async (tx) => {
      // Update Lead
      const lead = await tx.salesLead.update({
        where: { id },
        data: {
          title: data.title !== undefined ? data.title : undefined,
          source: data.source !== undefined ? data.source : undefined,
          pipelineStageId: actualPipelineStageId
        },
        include: { customer: true, pipelineStage: true }
      });

      // Update Customer
      if (data.firstName || data.lastName || data.email !== undefined || data.phone !== undefined) {
        await tx.customer.update({
          where: { id: existingLead.customerId },
          data: {
            firstName: data.firstName !== undefined ? data.firstName : undefined,
            lastName: data.lastName !== undefined ? data.lastName : undefined,
            email: data.email !== undefined ? data.email : undefined,
            phone: data.phone !== undefined ? data.phone : undefined,
          }
        });
      }

      // Add/Update FollowUp if date or notes provided
      if (data.followUpDate || data.notes) {
        const user = await tx.user.findUnique({ where: { id: req.user!.userId }, include: { employee: true } });
        if (user?.employee) {
          // Find if there is a pending followup
          const pendingFollowUp = await tx.followUp.findFirst({
            where: { salesLeadId: id as string, status: 'PENDING' },
            orderBy: { scheduledFor: 'asc' }
          });
          
          if (pendingFollowUp) {
            await tx.followUp.update({
              where: { id: pendingFollowUp.id },
              data: {
                scheduledFor: data.followUpDate ? new Date(data.followUpDate) : undefined,
                notes: data.notes !== undefined ? data.notes : undefined
              }
            });
          } else if (data.followUpDate) {
            await tx.followUp.create({
              data: {
                salesLeadId: id as string,
                type: 'Call',
                scheduledFor: new Date(data.followUpDate),
                notes: data.notes || '',
                employeeId: user.employee.id,
                status: 'PENDING'
              }
            });
          }
        }
      }

      if (lead.pipelineStage?.name === 'Won') {
        const existingWonLog = await tx.auditLog.findFirst({
          where: { recordId: id, action: 'LEAD_WON' }
        });
        if (!existingWonLog) {
          await tx.auditLog.create({
            data: {
              userId: req.user!.userId,
              userEmail: req.user!.email || 'system',
              action: 'LEAD_WON',
              module: 'CRM',
              recordId: id,
              details: `Lead stage changed to Won`
            }
          });
        }
      }

      return lead;
    });

    res.json({ success: true, data: updatedLead });
  } catch (error) {
    console.error('Failed to update lead:', error);
    res.status(500).json({ success: false, error: 'Failed to update lead' });
  }
};

export const deleteLead = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ownership = await verifyLeadOwnership(id, req);
    if (!ownership.allowed) {
      return res.status(ownership.statusCode).json({ success: false, error: ownership.error });
    }
    
    const existingLead = await prisma.salesLead.findUnique({
      where: { id }
    });

    if (!existingLead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    try {
      await prisma.salesLead.delete({
        where: { id }
      });
      return res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error: any) {
      // Check if the deletion was blocked by a foreign key constraint (e.g. Quotation requires salesLeadId)
      if (error.code === 'P2003') {
        // Soft-delete/Archive the lead instead
        await prisma.salesLead.update({
          where: { id },
          data: {
            pipelineStageId: null,
            status: 'ARCHIVED'
          }
        });
        return res.json({ success: true, message: 'Lead archived successfully' });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Failed to delete lead:', error);
    res.status(500).json({ success: false, error: 'Failed to delete lead' });
  }
};

// --- HYBRID AUTOMATIC LEAD ASSIGNMENT CONTROLLERS ---

export const getEligibleSalesExecutivesController = async (req: Request, res: Response) => {
  try {
    const executives = await getEligibleSalesExecutives();
    res.json({ success: true, data: executives });
  } catch (error: any) {
    console.error('Failed to get eligible sales executives:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch eligible sales executives' });
  }
};

export const getLeadAssignmentOverviewController = async (req: Request, res: Response) => {
  try {
    const overview = await getAssignmentOverview();
    res.json({ success: true, data: overview });
  } catch (error: any) {
    console.error('Failed to get lead assignment overview:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch assignment overview' });
  }
};

const assignLeadBodySchema = z.object({
  employeeId: z.string().uuid().nullable().optional(),
  reason: z.string().optional()
});

export const assignLeadController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const body = assignLeadBodySchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const access = await getLeadAccessContext(req);
    if (!access.isSuperOrAdmin && !access.isSalesManager) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Only Sales Managers, Admins, and Super Admins can assign or reassign leads.'
      });
    }

    const result = await assignLeadManually(id, body.employeeId || null, userId, body.reason);
    res.json({ success: true, data: result.lead, history: result.history });
  } catch (error: any) {
    console.error('Failed to assign lead:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to assign lead' });
  }
};

export const getLeadAssignmentHistoryController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ownership = await verifyLeadOwnership(id, req);
    if (!ownership.allowed) {
      return res.status(ownership.statusCode).json({ success: false, error: ownership.error });
    }

    const history = await getLeadAssignmentHistory(id);
    res.json({ success: true, data: history });
  } catch (error: any) {
    console.error('Failed to get lead assignment history:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch assignment history' });
  }
};

export const getAssignmentSettingsController = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
      select: { autoAssignLeads: true, autoAssignEnquiries: true }
    });
    res.json({
      success: true,
      data: {
        autoAssignLeads: settings?.autoAssignLeads ?? true,
        autoAssignEnquiries: settings?.autoAssignEnquiries ?? true
      }
    });
  } catch (error: any) {
    console.error('Failed to get assignment settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
};

const updateAssignmentSettingsSchema = z.object({
  autoAssignLeads: z.boolean()
});

export const updateAssignmentSettingsController = async (req: Request, res: Response) => {
  try {
    const body = updateAssignmentSettingsSchema.parse(req.body);
    const userId = req.user?.userId || 'system';

    const result = await setAutoAssignmentSetting(body.autoAssignLeads, userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Failed to update assignment settings:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to update settings' });
  }
};
