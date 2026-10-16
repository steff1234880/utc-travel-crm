import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getSalesDashboardMetrics = async (req: Request, res: Response) => {
  try {
    const totalLeads = await prisma.salesLead.count();
    const newLeads = await prisma.salesLead.count({ where: { pipelineStage: { name: 'New' } } });
    const wonLeads = await prisma.salesLead.count({ where: { pipelineStage: { name: 'Won' } } });
    const lostLeads = await prisma.salesLead.count({ where: { pipelineStage: { name: 'Lost' } } });
    
    // Revenue from actual valid payments (matches CEO Dashboard definition)
    const incomeTransAgg = await prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'INCOME', status: 'COMPLETED' }
    });
    const totalRevenue = incomeTransAgg._sum.amount || 0;
    
    const activeQuotations = await prisma.quotation.count({ where: { status: 'SENT' } });

    const activeLeads = totalLeads - wonLeads - lostLeads;

    // Fetch recent Sales Activities
    const salesActivities = await prisma.salesActivity.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: true,
        salesLead: { include: { customer: true } }
      }
    });

    // Fetch relevant CRM/Accounting Audit Logs
    const auditLogs = await prisma.auditLog.findMany({
      take: 10,
      where: {
        module: { in: ['CRM', 'ACCOUNTING', 'Sales CRM'] },
        action: { notIn: ['LOGIN'] }
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
        target: sa.salesLead?.customer ? `${sa.salesLead.customer.firstName} ${sa.salesLead.customer.lastName}` : 'Unknown',
        timestamp: sa.createdAt,
        source: 'SalesActivity'
      })),
      ...auditLogs.map((al: any) => ({
        id: al.id,
        type: al.action,
        description: al.details || `Audit action: ${al.action}`,
        actor: al.userEmail || 'System',
        target: al.module,
        timestamp: al.createdAt,
        source: 'AuditLog'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

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
    const stages = await prisma.salesPipelineStage.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        leads: {
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

