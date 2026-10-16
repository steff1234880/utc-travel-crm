import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { calculateGst, calculateExempt } from '../services/gstService';
import crypto from 'crypto';

const prisma = new PrismaClient();

const expenseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().uuid(),
  subCategory: z.string().optional(),
  vendorName: z.string().optional(),
  vendorContact: z.string().optional(),
  vendorGstin: z.string().optional(),
  expenseDate: z.string(),
  paymentDate: z.string().optional().nullable(),
  paymentMethod: z.string().optional(),
  amount: z.number().min(0),
  
  gstApplicable: z.boolean().default(false),
  gstType: z.string().default('NON_GST'),
  gstRate: z.number().default(0),
  isInclusive: z.boolean().default(false),
  isInterState: z.boolean().default(false),
  
  receiptUrl: z.string().optional()
});

export const createExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = expenseSchema.parse(req.body);
    
    // Calculate GST using our secure decimal.js backend service
    let gstData = {
      taxableAmount: data.amount,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTaxAmount: 0,
      totalAmount: data.amount
    };

    if (data.gstApplicable && data.gstType === 'GST') {
      gstData = calculateGst(data.amount, data.gstRate, data.isInclusive, data.isInterState);
    } else if (data.gstApplicable && data.gstType === 'EXEMPT') {
      gstData = calculateExempt(data.amount);
    }

    const employee = await prisma.employee.findFirst({ where: { userId: req.user!.userId } });
    if (!employee) {
      res.status(403).json({ error: 'Only employees can create expenses.' });
      return;
    }

    const expenseNumber = `EXP-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        subCategory: data.subCategory,
        vendorName: data.vendorName,
        vendorContact: data.vendorContact,
        vendorGstin: data.vendorGstin,
        expenseDate: new Date(data.expenseDate),
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
        paymentMethod: data.paymentMethod,
        
        amount: data.amount,
        taxableAmount: gstData.taxableAmount,
        gstApplicable: data.gstApplicable,
        gstType: data.gstType,
        gstRate: data.gstRate,
        cgstAmount: gstData.cgstAmount,
        sgstAmount: gstData.sgstAmount,
        igstAmount: gstData.igstAmount,
        totalTaxAmount: gstData.totalTaxAmount,
        totalAmount: gstData.totalAmount,
        
        receiptUrl: data.receiptUrl,
        status: 'DRAFT', // initial status
        createdById: employee.id
      }
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
    } else {
      console.error('Error creating expense:', error);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  }
};

export const updateExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = expenseSchema.parse(req.body);
    
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    if (existing.status === 'PAID') {
      res.status(400).json({ error: 'Cannot edit a paid expense' });
      return;
    }

    // Recalculate GST securely
    let gstData = {
      taxableAmount: data.amount,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTaxAmount: 0,
      totalAmount: data.amount
    };

    if (data.gstApplicable && data.gstType === 'GST') {
      gstData = calculateGst(data.amount, data.gstRate, data.isInclusive, data.isInterState);
    } else if (data.gstApplicable && data.gstType === 'EXEMPT') {
      gstData = calculateExempt(data.amount);
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        subCategory: data.subCategory,
        vendorName: data.vendorName,
        vendorContact: data.vendorContact,
        vendorGstin: data.vendorGstin,
        expenseDate: new Date(data.expenseDate),
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
        paymentMethod: data.paymentMethod,
        
        amount: data.amount,
        taxableAmount: gstData.taxableAmount,
        gstApplicable: data.gstApplicable,
        gstType: data.gstType,
        gstRate: data.gstRate,
        cgstAmount: gstData.cgstAmount,
        sgstAmount: gstData.sgstAmount,
        igstAmount: gstData.igstAmount,
        totalTaxAmount: gstData.totalTaxAmount,
        totalAmount: gstData.totalAmount,
        
        receiptUrl: data.receiptUrl
      }
    });

    res.json({ success: true, data: expense });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
    } else {
      console.error('Error updating expense:', error);
      res.status(500).json({ error: 'Failed to update expense' });
    }
  }
};

export const updateExpenseStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body; // SUBMITTED, APPROVED, PAID, REJECTED, CANCELLED
    
    const validStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    // Role-based restrictions mapping to logic
    // We assume middleware checks general route access, but here we can add specifics
    
    const employee = await prisma.employee.findFirst({ where: { userId: req.user!.userId } });
    if (!employee) {
      res.status(403).json({ error: 'Only employees can approve expenses.' });
      return;
    }
    
    const updateData: any = { status };
    if (status === 'APPROVED' || status === 'PAID') {
      updateData.approvedById = employee.id;
    }

    const updatedExpense = await prisma.$transaction(async (tx) => {
      // 1. If transitioning to APPROVED or PAID, and doesn't have a transaction yet, create it.
      if ((status === 'APPROVED' || status === 'PAID') && !expense.transactionId) {
        const txn = await tx.financialTransaction.create({
          data: {
            referenceNumber: `TXN-EXP-${Date.now()}`,
            type: 'EXPENSE',
            amount: expense.totalAmount,
            currency: 'INR', // Defaulting for now
            status: status === 'PAID' ? 'COMPLETED' : 'PENDING',
            date: expense.paymentDate || expense.expenseDate,
            paymentMethod: expense.paymentMethod,
            notes: `Expense: ${expense.title}`,
            createdById: employee.id
          }
        });

        // 2. Link GST Record to transaction if GST applies
        if (expense.gstApplicable && expense.gstType === 'GST') {
          await tx.gSTRecord.create({
            data: {
              transactionId: txn.id,
              gstNumber: expense.vendorGstin,
              taxableAmount: expense.taxableAmount,
              cgst: expense.cgstAmount,
              sgst: expense.sgstAmount,
              igst: expense.igstAmount,
              totalGst: expense.totalTaxAmount,
              invoiceDate: expense.expenseDate
            }
          });
        }
        updateData.transactionId = txn.id;
      }
      
      // If moving from APPROVED to PAID, update the transaction status
      if (status === 'PAID' && expense.transactionId) {
        await tx.financialTransaction.update({
          where: { id: expense.transactionId },
          data: { status: 'COMPLETED' }
        });
      }

      // If cancelling an approved/paid expense, we should ideally void the transaction
      if (status === 'CANCELLED' && expense.transactionId) {
         await tx.financialTransaction.update({
           where: { id: expense.transactionId },
           data: { status: 'CANCELLED' }
         });
         // In a robust system, you might also reverse GST records or keep them for audit.
      }

      return await tx.expense.update({
        where: { id },
        data: updateData,
        include: { category: true, createdBy: true, approvedBy: true }
      });
    });

    res.json({ success: true, data: updatedExpense });
  } catch (error) {
    console.error('Error updating expense status:', error);
    res.status(500).json({ error: 'Failed to update expense status' });
  }
};

export const getExpenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, categoryId, status, startDate, endDate } = req.query;
    let whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { vendorName: { contains: search as string, mode: 'insensitive' } },
        { expenseNumber: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (categoryId && categoryId !== 'all') {
      whereClause.categoryId = categoryId;
    }
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    if (startDate && endDate) {
      whereClause.expenseDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        category: true,
        createdBy: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } }
      },
      orderBy: { expenseDate: 'desc' }
    });

    res.json({ success: true, data: expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

export const getExpenseDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    // Basic metrics, excluding CANCELLED and REJECTED
    const activeExpenses = await prisma.expense.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'REJECTED'] }
      }
    });

    let totalAmount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;
    let paidAmount = 0;
    let totalGstAmount = 0;
    let totalNonGstAmount = 0;

    activeExpenses.forEach(e => {
      totalAmount += e.totalAmount;
      if (e.status === 'SUBMITTED' || e.status === 'DRAFT') pendingAmount += e.totalAmount;
      if (e.status === 'APPROVED') approvedAmount += e.totalAmount;
      if (e.status === 'PAID') paidAmount += e.totalAmount;

      if (e.gstApplicable && e.gstType === 'GST') {
        totalGstAmount += e.totalAmount;
      } else {
        totalNonGstAmount += e.totalAmount;
      }
    });

    res.json({
      success: true,
      data: {
        totalAmount,
        pendingAmount,
        approvedAmount,
        paidAmount,
        outstandingAmount: approvedAmount,
        totalGstAmount,
        totalNonGstAmount
      }
    });
  } catch (error) {
    console.error('Error fetching expense dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

export const deleteExpense = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existingExpense = await prisma.expense.findUnique({
      where: { id }
    });

    if (!existingExpense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    await prisma.expense.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};
