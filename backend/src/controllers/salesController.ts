import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { getLeadAccessContext } from './leadController';
import { repairOrphanedSalesLeads, resolveDefaultPipelineStageId } from '../services/pipelineStageService';

export const getSalesDashboardMetrics = async (req: Request, res: Response) => {
  try {
    // Base filter for active, valid business leads:
    // Excludes soft-deleted/archived leads and leads tied to deleted/inactive employees
    const validLeadWhere: Prisma.SalesLeadWhereInput = {
      status: { notIn: ['ARCHIVED', 'DELETED'] },
      OR: [
        { assignedToId: null },
        { assignedTo: { status: 'ACTIVE' } }
      ]
    };

    const totalLeads = await prisma.salesLead.count({ where: validLeadWhere });
    const newLeads = await prisma.salesLead.count({
      where: {
        ...validLeadWhere,
        pipelineStage: { name: 'New' }
      }
    });
    const wonLeads = await prisma.salesLead.count({
      where: {
        ...validLeadWhere,
        pipelineStage: { name: 'Won' }
      }
    });
    const lostLeads = await prisma.salesLead.count({
      where: {
        ...validLeadWhere,
        pipelineStage: { name: 'Lost' }
      }
    });
    
    // Revenue from actual valid payments (matches CEO Dashboard definition)
    const incomeTransAgg = await prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'INCOME', status: 'COMPLETED' }
    });
    const totalRevenue = incomeTransAgg._sum.amount || 0;
    
    const activeQuotations = await prisma.quotation.count({
      where: {
        status: 'SENT',
        salesLead: validLeadWhere
      }
    });

    const activeLeads = Math.max(0, totalLeads - wonLeads - lostLeads);

    // Fetch recent Sales Activities (only on active non-deleted leads with active employees)
    const salesActivities = await prisma.salesActivity.findMany({
      take: 10,
      where: {
        salesLead: validLeadWhere,
        employee: { status: 'ACTIVE' }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: true,
        salesLead: { include: { customer: true } }
      }
    });

    // Fetch relevant CRM/Accounting Audit Logs (exclude deleted employee history and system setting toggles)
    const activeUsers = await prisma.user.findMany({
      where: {
        employee: { status: 'ACTIVE' }
      },
      select: { email: true }
    });
    const activeEmails = activeUsers.map(u => u.email).filter(Boolean);

    const auditLogs = await prisma.auditLog.findMany({
      take: 20,
      where: {
        module: { in: ['CRM', 'ACCOUNTING', 'Sales CRM'] },
        action: { notIn: ['LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'UPDATE_SYSTEM_SETTINGS'] },
        userEmail: { in: activeEmails }
      },
      include: {
        user: {
          select: {
            employee: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format and merge activities
    const formattedActivities = [
      ...salesActivities.map((sa: any) => ({
        id: sa.id,
        type: sa.action,
        description: sa.description || `Action on lead: ${sa.salesLead?.title}`,
        actor: sa.employee ? `${sa.employee.firstName} ${sa.employee.lastName}` : 'System',
        target: sa.salesLead?.customer ? `${sa.salesLead.customer.firstName} ${sa.salesLead.customer.lastName}` : (sa.salesLead?.title || 'Unknown'),
        timestamp: sa.createdAt,
        source: 'SalesActivity'
      })),
      ...auditLogs.map((al: any) => {
        let target = al.module;
        if (al.action === 'LEAD_DELETED' && al.previousValue) {
          try {
            const parsed = typeof al.previousValue === 'string' ? JSON.parse(al.previousValue) : al.previousValue;
            target = parsed.title || parsed.customerName || (parsed.id ? `Lead #${parsed.id.slice(0, 8)}` : al.module);
          } catch {
            target = al.recordId ? `Lead #${al.recordId.slice(0, 8)}` : al.module;
          }
        }

        const employeeName = al.user?.employee 
          ? `${al.user.employee.firstName} ${al.user.employee.lastName}`.trim()
          : null;

        return {
          id: al.id,
          type: al.action,
          description: al.details || `Audit action: ${al.action}`,
          actor: employeeName || al.userEmail || 'System',
          target,
          timestamp: al.createdAt,
          source: 'AuditLog'
        };
      })
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 15);

    res.json({
      success: true,
      data: {
        totalLeads,
        activeLeads,
        newLeads,
        wonLeads,
        lostLeads,
        totalRevenue,
        activeQuotations,
        conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
        recentActivity: formattedActivities
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch sales dashboard metrics' });
  }
};

export const getSalesPipeline = async (req: Request, res: Response) => {
  try {
    const access = await getLeadAccessContext(req);
    const requestedScope = String(req.query.scope || '').trim().toLowerCase();

    // Auto-repair any orphaned leads (missing or invalid stage) so they never silently vanish
    await repairOrphanedSalesLeads().catch(err => {
      console.error('[Sales Pipeline] Auto-repair warning:', err);
    });

    let leadFilter: Prisma.SalesLeadWhereInput = {
      status: { notIn: ['ARCHIVED', 'DELETED'] },
      OR: [
        { assignedToId: null },
        { assignedTo: { status: 'ACTIVE' } }
      ]
    };

    if (access.isSalesManager) {
      // Sales Manager: defaults to personal assigned leads unless 'scope=all' is explicitly requested
      if (requestedScope !== 'all') {
        leadFilter = {
          status: { notIn: ['ARCHIVED', 'DELETED'] },
          assignedToId: access.employeeId || '__NO_ASSIGNED_LEADS__'
        };
      }
    } else if (access.isOwnLeadsOnlyRole) {
      // Sales Executives and other restricted roles: strictly restricted to own leads (cannot bypass via query param)
      leadFilter = {
        status: { notIn: ['ARCHIVED', 'DELETED'] },
        assignedToId: access.employeeId || '__NO_ASSIGNED_LEADS__'
      };
    }

    const stages = await prisma.salesPipelineStage.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        leads: {
          where: leadFilter,
          include: { customer: true, assignedTo: true },
          orderBy: { updatedAt: 'desc' }
        }
      }
    });
    res.json({ success: true, data: stages });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch pipeline' });
  }
};

export const getBookingPreparations = async (req: Request, res: Response) => {
  try {
    const bookings = await prisma.bookingPreparation.findMany({
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        quotation: true,
        payments: {
          include: { transaction: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedBookings = bookings.map(b => {
      const totalAmount = b.taxableAmount + b.totalTaxAmount;
      const totalReceived = b.payments.reduce((sum, p) => p.transaction.status === 'COMPLETED' ? sum + p.transaction.amount : sum, 0);
      const balanceAmount = totalAmount - totalReceived;
      
      let paymentStatus = 'PENDING';
      if (totalReceived > 0 && totalReceived < totalAmount) paymentStatus = 'PARTIALLY_PAID';
      if (totalReceived > 0 && totalReceived >= totalAmount) paymentStatus = 'PAID';

      return {
        ...b,
        totalAmount,
        totalReceived,
        balanceAmount,
        paymentStatus
      };
    });

    res.json({ bookings: enrichedBookings, success: true });
  } catch (error) {
    console.error('Error fetching booking preparations:', error);
    res.status(500).json({ error: 'Failed to fetch booking preparations' });
  }
};

export const getBookingPreparationById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const booking = await prisma.bookingPreparation.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: { include: { items: true } },
        preparedBy: true,
        payments: {
          include: { transaction: true }
        },
        tours: true,
        operationalCosts: true
      }
    });

    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });

    const totalAmount = booking.taxableAmount + booking.totalTaxAmount;
    const totalReceived = booking.payments.reduce((sum: any, p: any) => p.transaction.status === 'COMPLETED' ? sum + p.transaction.amount : sum, 0);
    const balanceAmount = totalAmount - totalReceived;
    
    let paymentStatus = 'PENDING';
    if (totalReceived > 0 && totalReceived < totalAmount) paymentStatus = 'PARTIALLY_PAID';
    if (totalReceived > 0 && totalReceived >= totalAmount) paymentStatus = 'PAID';

    res.json({ success: true, data: { ...booking, totalAmount, totalReceived, balanceAmount, paymentStatus } });
  } catch (error) {
    console.error('Error fetching booking by id:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch booking' });
  }
};

