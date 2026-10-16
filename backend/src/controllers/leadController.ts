import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

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

export const getLeads = async (req: Request, res: Response) => {
  try {
    const { status, pipelineStageId, assignedToId } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (pipelineStageId) where.pipelineStageId = String(pipelineStageId);
    if (assignedToId) where.assignedToId = String(assignedToId);

    // If user is Sales Executive, only show their leads
    const userRole = await prisma.role.findUnique({ where: { id: req.user!.roleId! } });
    if (userRole?.name === 'SALES_EXECUTIVE') {
      const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
      if (employee) {
        where.assignedToId = employee.id;
      }
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
    const lead = await prisma.salesLead.findUnique({
      where: { id },
      include: {
        customer: true,
        pipelineStage: true,
        assignedTo: true,
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
    
    const lead = await prisma.salesLead.create({ 
      data: {
        ...leadData,
        pipelineStageId: actualPipelineStageId,
        requirements: destination ? {
          create: {
            destination
          }
        } : undefined
      },
      include: { customer: true, pipelineStage: true, assignedTo: true, requirements: true }
    });
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Failed to create lead', details: error });
  }
};

export const updateLeadStage = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { pipelineStageId } = req.body;
    
    if (!pipelineStageId) return res.status(400).json({ success: false, error: 'pipelineStageId is required' });

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
    const followUpId = req.params.followUpId as string;
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
    const followUpId = req.params.followUpId as string;
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
