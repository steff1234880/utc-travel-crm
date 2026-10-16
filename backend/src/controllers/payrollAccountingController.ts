import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { paySalary, payBonus, payIncentive, getPayrollAccountingDashboard } from '../services/payrollAccountingService';

const prisma = new PrismaClient();

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await getPayrollAccountingDashboard();
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching payroll accounting dashboard:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard' });
  }
};

export const processSalaryPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { paymentMethod } = req.body;
    const userId = (req as any).user.id;

    const result = await paySalary(id, userId, paymentMethod);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process salary payment' });
  }
};

export const processBonusPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { paymentMethod } = req.body;
    const userId = (req as any).user.id;

    const result = await payBonus(id, userId, paymentMethod);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process bonus payment' });
  }
};

export const processIncentivePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { paymentMethod } = req.body;
    const userId = (req as any).user.id;

    const result = await payIncentive(id, userId, paymentMethod);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process incentive payment' });
  }
};

export const createIncentiveRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, type, amount, reason, period, notes } = req.body;

    if (!employeeId || !type || !amount || !reason) {
      res.status(400).json({ error: 'employeeId, type, amount, and reason are required.' });
      return;
    }

    const validTypes = ['INCENTIVE', 'COMMISSION'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: 'type must be INCENTIVE or COMMISSION.' });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: 'amount must be a positive number.' });
      return;
    }

    // Resolve the Employee record for the creator
    const creatorEmployee = await prisma.employee.findFirst({
      where: { userId: req.user!.userId }
    });
    if (!creatorEmployee) {
      res.status(403).json({ error: 'Only employees can create incentive/commission records.' });
      return;
    }

    // Validate the target employee exists
    const targetEmployee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!targetEmployee) {
      res.status(404).json({ error: 'Target employee not found.' });
      return;
    }

    const record = await prisma.employeeIncentive.create({
      data: {
        employeeId,
        type,
        amount: parsedAmount,
        reason,
        period: period || null,
        notes: notes || null,
        status: 'DRAFT',
        createdById: creatorEmployee.id
      },
      include: { employee: true }
    });

    res.status(201).json({ success: true, data: record });
  } catch (error: any) {
    console.error('Error creating incentive/commission record:', error);
    res.status(500).json({ error: 'Failed to create incentive/commission record.' });
  }
};
