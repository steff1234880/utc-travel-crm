import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Generate a random, unique reference number (e.g., TX-1638202-ABCD)
const generateRefNumber = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
};

export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      customerId, 
      bookingPrepId, 
      quotationId, 
      amount, 
      paymentType, 
      paymentMethod, 
      notes, 
      date,
      status 
    } = req.body;

    if (!customerId) {
      res.status(400).json({ error: 'Customer is required' });
      return;
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      res.status(400).json({ error: 'Valid amount is required' });
      return;
    }

    const validPaymentTypes = ['ADVANCE', 'PARTIAL', 'FINAL', 'INCENTIVE', 'COMMISSION', 'OTHER'];
    if (paymentType && !validPaymentTypes.includes(paymentType.toUpperCase())) {
      res.status(400).json({ error: `Invalid payment type. Must be one of: ${validPaymentTypes.join(', ')}` });
      return;
    }

    const userId = req.user?.userId;
    const employee = userId ? await prisma.employee.findFirst({ where: { userId } }) : null;

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.financialTransaction.create({
        data: {
          referenceNumber: generateRefNumber('TX'),
          type: 'INCOME',
          amount: parseFloat(amount),
          status: status || 'COMPLETED',
          paymentMethod: paymentMethod || 'BANK_TRANSFER',
          notes,
          date: date ? new Date(date) : new Date(),
          createdById: employee?.id
        }
      });

      const payment = await tx.customerPayment.create({
        data: {
          transactionId: transaction.id,
          customerId,
          bookingPrepId: bookingPrepId || null,
          quotationId: quotationId || null,
          paymentType: paymentType || 'PARTIAL'
        }
      });

      // Also create a RevenueRecord to reflect in the Revenue Management module
      if (employee) {
        await tx.revenueRecord.create({
          data: {
            referenceNumber: generateRefNumber('REV'),
            customerId,
            bookingPrepId: bookingPrepId || null,
            quotationId: quotationId || null,
            amount: parseFloat(amount),
            revenueType: bookingPrepId ? 'PACKAGE' : 'OTHER_SERVICE',
            paymentId: payment.id,
            paymentStatus: status || 'COMPLETED',
            gstStatus: 'GST_INCLUDED',
            createdById: employee.id,
            date: date ? new Date(date) : new Date()
          }
        });
      }

      if (userId) {
        await tx.auditLog.create({
          data: {
            userId,
            userEmail: req.user!.email || 'unknown',
            action: 'CREATE_PAYMENT',
            module: 'ACCOUNTING',
            recordId: transaction.id,
            details: `Created ${paymentType || 'PARTIAL'} payment of ${amount} for customer ${customerId}`,
          }
        });
      }

      return { transaction, payment };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

export const getPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, bookingPrepId, type, status, search, page = '1', limit = '50' } = req.query;
    
    let whereClause: Prisma.FinancialTransactionWhereInput = {
      type: 'INCOME'
    };
    
    if (status) whereClause.status = status as string;
    if (search) {
      whereClause.OR = [
        { referenceNumber: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    // Nested filtering for customerPayment
    if (customerId || bookingPrepId || type) {
      whereClause.customerPayment = {
        is: {}
      };
      if (customerId) (whereClause.customerPayment.is as any).customerId = customerId as string;
      if (bookingPrepId) (whereClause.customerPayment.is as any).bookingPrepId = bookingPrepId as string;
      if (type) (whereClause.customerPayment.is as any).paymentType = type as string;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: {
          customerPayment: { 
            include: { 
              customer: true,
              bookingPrep: true,
              quotation: true
            } 
          },
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
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const getPaymentDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    
    const transaction = await prisma.financialTransaction.findUnique({
      where: { id },
      include: {
        customerPayment: { 
          include: { 
            customer: true,
            bookingPrep: true,
            quotation: {
              include: { salesLead: true }
            }
          } 
        },
        createdBy: { select: { firstName: true, lastName: true } }
      }
    });

    if (!transaction) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
};

export const createRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, quotationId, amount, reason, date, paymentMethod, status } = req.body;

    if (!customerId) {
      res.status(400).json({ error: 'Customer is required' });
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: 'Refund amount must be a positive number greater than zero' });
      return;
    }

    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'Refund reason is required' });
      return;
    }

    const userId = req.user?.userId;
    const employee = userId ? await prisma.employee.findFirst({ where: { userId } }) : null;

    // Check if the refund exceeds total collected for this quotation or customer
    if (quotationId) {
      const q = await prisma.quotation.findUnique({
        where: { id: quotationId },
        include: { 
          payments: { include: { transaction: true } },
          refunds: { include: { transaction: true } }
        }
      });
      
      if (q) {
        const totalPaid = q.payments.reduce((acc, p) => p.transaction && p.transaction.status === 'COMPLETED' ? acc + p.transaction.amount : acc, 0);
        const totalRefunded = q.refunds.reduce((acc, r) => r.transaction && r.transaction.status === 'COMPLETED' ? acc + r.transaction.amount : acc, 0);
        const maxRefundable = Math.max(0, totalPaid - totalRefunded);
        
        if (numAmount > maxRefundable) {
          res.status(400).json({ 
            error: `Refund amount (₹${numAmount}) exceeds maximum eligible refundable amount (₹${maxRefundable}) for this quotation.` 
          });
          return;
        }
      }
    } else {
      // General customer-wide check
      const [customerPayments, customerRefunds] = await Promise.all([
        prisma.customerPayment.findMany({
          where: { customerId },
          include: { transaction: true }
        }),
        prisma.refund.findMany({
          where: { customerId },
          include: { transaction: true }
        })
      ]);

      const totalPaid = customerPayments.reduce((acc, p) => p.transaction && p.transaction.status === 'COMPLETED' ? acc + p.transaction.amount : acc, 0);
      const totalRefunded = customerRefunds.reduce((acc, r) => r.transaction && r.transaction.status === 'COMPLETED' ? acc + r.transaction.amount : acc, 0);
      const maxRefundable = Math.max(0, totalPaid - totalRefunded);

      if (numAmount > maxRefundable) {
        res.status(400).json({ 
          error: `Refund amount (₹${numAmount}) exceeds total eligible paid amount (₹${maxRefundable}) for this customer.` 
        });
        return;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.financialTransaction.create({
        data: {
          referenceNumber: generateRefNumber('REF'),
          type: 'REFUND',
          amount: numAmount,
          status: status || 'COMPLETED',
          paymentMethod: paymentMethod || 'SYSTEM_REFUND',
          notes: reason,
          date: date ? new Date(date) : new Date(),
          createdById: employee?.id
        }
      });

      const refund = await tx.refund.create({
        data: {
          transactionId: transaction.id,
          customerId,
          quotationId: quotationId || null,
          reason
        }
      });

      return { transaction, refund };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
};

export const getRefunds = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, quotationId, search, status, page = '1', limit = '50' } = req.query;

    let whereClause: Prisma.FinancialTransactionWhereInput = {
      type: 'REFUND'
    };

    if (status) whereClause.status = status as string;

    if (search) {
      whereClause.OR = [
        { referenceNumber: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } },
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
      ];
    }

    if (customerId || quotationId) {
      whereClause.refund = {
        is: {}
      };
      if (customerId) (whereClause.refund.is as any).customerId = customerId as string;
      if (quotationId) (whereClause.refund.is as any).quotationId = quotationId as string;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: {
          refund: {
            include: {
              customer: true,
              quotation: true
            }
          },
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
    console.error('Error fetching refunds:', error);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
};

export const cancelRefund = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const transaction = await prisma.financialTransaction.findUnique({
      where: { id },
      include: { refund: true }
    });

    if (!transaction || transaction.type !== 'REFUND') {
      res.status(404).json({ error: 'Refund transaction not found' });
      return;
    }

    if (transaction.status === 'CANCELLED') {
      res.status(400).json({ error: 'Refund transaction is already cancelled' });
      return;
    }

    const updated = await prisma.financialTransaction.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error cancelling refund:', error);
    res.status(500).json({ error: 'Failed to cancel refund' });
  }
};

export const getOutstandingBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quotationId } = req.params as { quotationId: string };

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        payments: { include: { transaction: true } },
        refunds: { include: { transaction: true } }
      }
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const totalAmount = quotation.finalAmount || 0;
    
    let totalPaid = 0;
    quotation.payments.forEach(p => {
      if (p.transaction && p.transaction.status === 'COMPLETED') {
        totalPaid += p.transaction.amount;
      }
    });

    let totalRefunded = 0;
    quotation.refunds.forEach(r => {
      if (r.transaction && r.transaction.status === 'COMPLETED') {
        totalRefunded += r.transaction.amount;
      }
    });

    // Valid payments effectively collected: totalPaid - totalRefunded
    const outstandingBalance = totalAmount - (totalPaid - totalRefunded);

    res.json({
      success: true,
      data: {
        quotationId: quotation.id,
        totalAmount,
        totalPaid,
        totalRefunded,
        outstandingBalance: Math.max(0, outstandingBalance)
      }
    });
  } catch (error) {
    console.error('Error fetching outstanding balance:', error);
    res.status(500).json({ error: 'Failed to calculate balance' });
  }
};

export const deletePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const transaction = await prisma.financialTransaction.findUnique({
      where: { id },
      include: {
        customerPayment: true,
        expense: true,
        salaryRecord: true,
        refund: true,
        gstRecord: true
      }
    });

    if (!transaction) {
      res.status(404).json({ success: false, message: 'Financial transaction not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (transaction.expense) {
        await tx.expense.update({
          where: { id: transaction.expense.id },
          data: { transactionId: null }
        });
      }

      if (transaction.salaryRecord) {
        await tx.salaryRecord.update({
          where: { id: transaction.salaryRecord.id },
          data: { transactionId: null }
        });
      }

      await tx.financialTransaction.delete({
        where: { id }
      });
    });

    res.json({ success: true, message: 'Financial transaction deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting financial transaction:', error);
    res.status(500).json({ success: false, message: error?.message || 'Failed to delete transaction' });
  }
};


/**
 * GET /accounting/payments/payable-quotations
 *
 * Returns quotations that are valid for payment recording.
 * Valid statuses: 'ACCEPTED' (customer accepted) or 'SENT' (sent to customer).
 *
 * NOTE: This system uses 'ACCEPTED' - NOT 'APPROVED' - as the quotation accepted status.
 * 'APPROVED' does not exist in the Quotation status lifecycle.
 */
export const getPayableQuotations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.query;

    const whereClause: any = {
      status: { in: ['ACCEPTED', 'SENT'] }
    };

    if (customerId) {
      whereClause.customerId = customerId as string;
    }

    const quotations = await prisma.quotation.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: quotations });
  } catch (error) {
    console.error('Error fetching payable quotations:', error);
    res.status(500).json({ error: 'Failed to fetch payable quotations' });
  }
};

export const updatePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { paymentMethod, paymentType, notes, date, status } = req.body;
    
    const transaction = await prisma.financialTransaction.findUnique({
      where: { id },
      include: { customerPayment: true }
    });

    if (!transaction) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const validPaymentTypes = ['ADVANCE', 'PARTIAL', 'FINAL', 'INCENTIVE', 'COMMISSION', 'OTHER'];
    if (paymentType && !validPaymentTypes.includes(paymentType.toUpperCase())) {
      res.status(400).json({ error: 'Invalid payment type' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedTx = await tx.financialTransaction.update({
        where: { id },
        data: {
          paymentMethod: paymentMethod || transaction.paymentMethod,
          notes: notes !== undefined ? notes : transaction.notes,
          date: date ? new Date(date) : transaction.date,
          status: status || transaction.status
        }
      });

      if (transaction.customerPayment && paymentType) {
        await tx.customerPayment.update({
          where: { id: transaction.customerPayment.id },
          data: { paymentType }
        });
        
        if (status && status !== transaction.status) {
           await tx.revenueRecord.updateMany({
             where: { paymentId: transaction.customerPayment.id },
             data: { paymentStatus: status }
           });
        }
      }

      return updatedTx;
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
};
