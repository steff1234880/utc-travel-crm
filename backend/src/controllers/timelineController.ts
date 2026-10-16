import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getTimeline = async (req: Request, res: Response): Promise<void> => {
  try {
    const entityType = req.params.entityType as string;
    const entityId = req.params.entityId as string;

    if (!entityType || !entityId) {
      res.status(400).json({ error: 'Entity type and ID are required' });
      return;
    }

    let timelineEvents: any[] = [];

    // Base records to search across AuditLog, FollowUp, etc.
    // For a specific Customer, we might want to get all leads, bookings, tours related to them.
    // This allows one connected activity/timeline experience across the pipeline.
    let relatedIds: string[] = [entityId];

    if (entityType.toUpperCase() === 'CUSTOMER') {
      const customer = await prisma.customer.findUnique({
        where: { id: entityId },
        include: {
          enquiries: true,
          salesLeads: true,
          quotations: true,
          bookingPreps: true,
          payments: true
        }
      });
      if (customer) {
        relatedIds = [
          entityId,
          ...((customer as any).enquiries || []).map((e: any) => e.id),
          ...((customer as any).salesLeads || []).map((l: any) => l.id),
          ...((customer as any).quotations || []).map((q: any) => q.id),
          ...((customer as any).bookingPreps || []).map((b: any) => b.id),
          ...((customer as any).payments || []).map((p: any) => p.id)
        ];
      }
    } else if (entityType.toUpperCase() === 'LEAD') {
      const lead = await prisma.salesLead.findUnique({
        where: { id: entityId },
        include: {
          enquiry: true,
          quotations: { include: { bookingPrep: true } },
          customer: true
        }
      });
      if (lead) {
        relatedIds = [
          entityId,
          ...((lead as any).enquiryId ? [(lead as any).enquiryId] : []),
          ...((lead as any).customerId ? [(lead as any).customerId] : []),
          ...((lead as any).quotations || []).map((q: any) => q.id),
          ...((lead as any).quotations || []).filter((q: any) => q.bookingPrep).map((q: any) => q.bookingPrep.id)
        ];
      }
    } else if (entityType.toUpperCase() === 'BOOKING') {
      const booking = await prisma.bookingPreparation.findUnique({
        where: { id: entityId },
        include: {
          quotation: true,
          tours: true,
          customer: true
        }
      });
      if (booking) {
        relatedIds = [
          entityId,
          ...((booking as any).quotationId ? [(booking as any).quotationId] : []),
          ...((booking as any).customerId ? [(booking as any).customerId] : []),
          ...((booking as any).tours || []).map((t: any) => t.id)
        ];
      }
    } else if (entityType.toUpperCase() === 'TOUR') {
      const tour = await prisma.tour.findUnique({
        where: { id: entityId },
        include: {
          bookingPrep: true,
          customer: true
        }
      });
      if (tour) {
        relatedIds = [
          entityId,
          ...((tour as any).bookingPrepId ? [(tour as any).bookingPrepId] : []),
          ...((tour as any).customerId ? [(tour as any).customerId] : [])
        ];
      }
    }

    // 1. Fetch Audit Logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        recordId: { in: relatedIds }
      },
      orderBy: { createdAt: 'desc' }
    });

    auditLogs.forEach(log => {
      let title = `${log.action} in ${log.module}`;
      if (log.action === 'LEAD_WON') title = 'Lead Won';
      else if (log.action === 'QUOTATION_ACCEPTED') title = 'Quotation Accepted';
      else if (log.action === 'CONVERT_TO_BOOKING') title = 'Booking Created';

      timelineEvents.push({
        id: log.id,
        type: 'AUDIT',
        title: title,
        description: log.details || `Value changed from ${log.previousValue} to ${log.newValue}`,
        timestamp: log.createdAt,
        user: log.userEmail,
        recordId: log.recordId,
        metadata: {
          action: log.action,
          module: log.module
        }
      });
    });

    // 2. Fetch Follow-ups
    const followUps = await prisma.followUp.findMany({
      where: {
        OR: [
          { enquiryId: { in: relatedIds } },
          { salesLeadId: { in: relatedIds } },
          { customerId: { in: relatedIds } },
          { quotationId: { in: relatedIds } },
          { bookingPrepId: { in: relatedIds } },
          { tourId: { in: relatedIds } }
        ]
      },
      include: { employee: true },
      orderBy: { scheduledFor: 'desc' }
    });

    followUps.forEach(fu => {
      timelineEvents.push({
        id: fu.id,
        type: 'FOLLOWUP',
        // FIX: title now shows the scheduled date for easy scanning
        title: `Follow-up: ${fu.type} (${fu.status})`,
        description: fu.notes || 'No notes provided',
        // FIX: use scheduledFor (the saved follow-up date), NOT createdAt (record creation date)
        timestamp: fu.scheduledFor,
        user: `${fu.employee?.firstName} ${fu.employee?.lastName || ''}`.trim(),
        recordId: fu.id,
        metadata: {
          status: fu.status,
          scheduledFor: fu.scheduledFor,
          createdAt: fu.createdAt
        }
      });
    });

    // 3. Sort chronologically
    timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ success: true, data: timelineEvents });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline data' });
  }
};
