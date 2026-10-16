import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generatePnLStatement } from '../services/pnlService';

const prisma = new PrismaClient();

// ─── ACCOUNTING FOUNDATION ──────────────────────────────────────────────────

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.gte = new Date(startDate as string);
      if (endDate) dateFilter.date.lte = new Date(endDate as string);
    }

    const transactions = await prisma.financialTransaction.findMany({
      where: dateFilter,
      include: { gstRecord: true }
    });

    const pnl = await generatePnLStatement({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    const totalRevenue = pnl.revenue.total;
    const totalExpenses = pnl.expenses.total;
    const netProfit = pnl.profitability.netProfit;

    let refundAmounts = 0;
    let pendingPayments = 0;
    let gstCollected = 0;

    transactions.forEach(t => {
      // Exclude cancelled/failed
      if (t.status === 'CANCELLED' || t.status === 'FAILED') return;

      if (t.status === 'PENDING' && t.type === 'INCOME') {
        pendingPayments += t.amount;
      }

      if (t.status === 'COMPLETED') {
        if (t.type === 'REFUND') refundAmounts += t.amount;
        
        if (t.gstRecord) {
          gstCollected += t.gstRecord.totalGst;
        }
      }
    });

    // Outstanding Balances from Quotations that are APPROVED but not fully paid
    let quoteDateFilter: any = {};
    if (startDate || endDate) {
      quoteDateFilter.createdAt = {};
      if (startDate) quoteDateFilter.createdAt.gte = new Date(startDate as string);
      if (endDate) quoteDateFilter.createdAt.lte = new Date(endDate as string);
    }

    const activeBookingsForOutstanding = await prisma.bookingPreparation.findMany({
      where: { 
        status: { not: 'CANCELLED' },
        ...quoteDateFilter
      },
      include: {
        quotation: {
          include: { payments: { include: { transaction: true } } }
        },
        payments: { include: { transaction: true } }
      }
    });

    let outstandingBalances = 0;
    activeBookingsForOutstanding.forEach(b => {
      const allPayments = [
        ...(b.payments || []),
        ...(b.quotation?.payments || [])
      ];
      
      const uniquePaymentsMap = new Map();
      allPayments.forEach(p => {
        if (p.transaction?.status === 'COMPLETED') {
          uniquePaymentsMap.set(p.id, p.transaction.amount);
        }
      });
      
      let paid = 0;
      uniquePaymentsMap.forEach(amount => { paid += amount; });
      
      // Only consider active bookings that have received a valid payment
      if (paid > 0) {
        const totalAmount = b.quotation?.basePrice || b.taxableAmount || 0;
        const remaining = totalAmount - paid;
        if (remaining > 0) outstandingBalances += remaining;
      }
    });

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        netProfit,
        pendingPayments,
        outstandingBalances,
        refundAmounts,
        gstCollected
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
  }
};

export const getFinancialTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    // For trends, let's group by month for the current year
    const currentYear = new Date().getFullYear();
    const startDate = new Date(`${currentYear}-01-01`);
    const endDate = new Date(`${currentYear}-12-31`);

    const transactions = await prisma.financialTransaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: 'COMPLETED'
      },
      select: { amount: true, type: true, date: true }
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trends = months.map(month => ({ name: month, revenue: 0, expenses: 0 }));

    transactions.forEach(t => {
      const mIdx = t.date.getMonth();
      if (t.type === 'INCOME') trends[mIdx].revenue += t.amount;
      if (t.type === 'EXPENSE' || t.type === 'SALARY') trends[mIdx].expenses += t.amount;
    });

    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch financial trends' });
  }
};

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, type, status, search, customerId, page = '1', limit = '50' } = req.query;
    
    let andConditions: any[] = [];
    
    if (startDate || endDate) {
      let dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);
      andConditions.push({ date: dateFilter });
    }
    
    if (type) andConditions.push({ type });
    if (status) andConditions.push({ status });
    if (req.query.paymentType) {
      andConditions.push({ customerPayment: { paymentType: req.query.paymentType as string } });
    }
    
    if (search) {
      andConditions.push({
        OR: [
          { referenceNumber: { contains: search as string, mode: 'insensitive' } },
          { notes: { contains: search as string, mode: 'insensitive' } },
          { 
            customerPayment: { 
              customer: { 
                OR: [
                  { firstName: { contains: search as string, mode: 'insensitive' } },
                  { lastName: { contains: search as string, mode: 'insensitive' } }
                ]
              }
            } 
          },
          { 
            refund: { 
              customer: { 
                OR: [
                  { firstName: { contains: search as string, mode: 'insensitive' } },
                  { lastName: { contains: search as string, mode: 'insensitive' } }
                ]
              }
            } 
          }
        ]
      });
    }

    if (customerId) {
      andConditions.push({
        OR: [
          { customerPayment: { customerId: customerId as string } },
          { refund: { customerId: customerId as string } }
        ]
      });
    }

    let whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: {
          customerPayment: { include: { customer: true, quotation: true } },
          expense: { include: { category: true } },
          refund: { include: { customer: true } },
          gstRecord: true,
          createdBy: { select: { firstName: true, lastName: true } }
        }
      }),
      prisma.financialTransaction.count({ where: whereClause })
    ]);

    res.json({ 
      success: true, 
      data: transactions,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching financial transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

export const getExpenseCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};
