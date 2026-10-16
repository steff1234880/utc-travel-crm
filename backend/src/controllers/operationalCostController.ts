import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { logOperationsActivity } from '../utils/auditLogger';

const costSchema = z.object({
  tourId: z.string().optional().nullable(),
  bookingPrepId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  costCategory: z.string().min(1, 'Cost category is required'), // Hotel, Flight, Train, Bus, Transportation, Activity, Vendor, Other
  description: z.string().min(1, 'Description is required'),
  estimatedCost: z.coerce.number().min(0, 'Estimated cost must be non-negative'),
  actualCost: z.coerce.number().min(0, 'Actual cost must be non-negative'),
  currency: z.string().optional().default('INR'),
  paymentStatus: z.string().optional().default('Pending'), // Pending, Partially Paid, Paid, Cancelled
  costDate: z.string().optional(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  syncToAccounting: z.boolean().optional().default(false),
});

const sanitizeStr = (val: any): string | null => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

// Helper to resolve employeeId from token req.user.userId
async function getEmployeeIdFromUserId(userId?: string): Promise<string | null> {
  if (!userId) return null;
  const emp = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  return emp ? emp.id : null;
}

// 1. GET /api/operations/costs
export const getOperationalCosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, tourId, vendorId, costCategory, paymentStatus, dateFrom, dateTo, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (search) {
      const q = (search as string).trim();
      whereClause.OR = [
        { costReference: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { tour: { tourReference: { contains: q, mode: 'insensitive' } } },
        { vendor: { companyName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (tourId) whereClause.tourId = tourId as string;
    if (vendorId) whereClause.vendorId = vendorId as string;
    if (costCategory && costCategory !== 'ALL') whereClause.costCategory = costCategory as string;
    if (paymentStatus && paymentStatus !== 'ALL') whereClause.paymentStatus = paymentStatus as string;

    if (dateFrom || dateTo) {
      whereClause.costDate = {};
      if (dateFrom) whereClause.costDate.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.costDate.lte = new Date(dateTo as string);
    }

    const [costs, total] = await Promise.all([
      prisma.operationalCost.findMany({
        where: whereClause,
        orderBy: { costDate: 'desc' },
        skip,
        take: limitNum,
        include: {
          tour: { select: { id: true, tourReference: true, destination: true } },
          vendor: { select: { id: true, vendorCode: true, companyName: true } },
          expense: { select: { id: true, expenseNumber: true, status: true, totalAmount: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.operationalCost.count({ where: whereClause }),
    ]);

    // Aggregate cost totals Decimal-safely
    const aggregations = await prisma.operationalCost.aggregate({
      where: whereClause,
      _sum: {
        estimatedCost: true,
        actualCost: true,
      },
    });

    res.status(200).json({
      costs,
      summary: {
        totalEstimatedCost: aggregations._sum.estimatedCost ? Number(aggregations._sum.estimatedCost) : 0,
        totalActualCost: aggregations._sum.actualCost ? Number(aggregations._sum.actualCost) : 0,
      },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching operational costs:', error);
    res.status(500).json({ error: 'Failed to fetch operational costs' });
  }
};

// Helper: Ensure "OPERATIONAL" ExpenseCategory exists in Accounting
async function getOrCreateOperationalCategory(): Promise<string> {
  const existing = await prisma.expenseCategory.findFirst({
    where: { name: { equals: 'OPERATIONAL', mode: 'insensitive' } },
  });

  if (existing) return existing.id;

  const created = await prisma.expenseCategory.create({
    data: {
      name: 'OPERATIONAL',
      description: 'Tour Operations & Logistics Expenses',
      isActive: true,
    },
  });
  return created.id;
}

// 2. POST /api/operations/costs
export const createOperationalCost = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = costSchema.parse(req.body);

    const tourId = sanitizeStr(validated.tourId);
    const bookingPrepId = sanitizeStr(validated.bookingPrepId);
    const vendorId = sanitizeStr(validated.vendorId);
    const createdById = await getEmployeeIdFromUserId(req.user?.userId);

    // Validate relationships if provided
    if (tourId) {
      const tourExists = await prisma.tour.findUnique({ where: { id: tourId } });
      if (!tourExists) {
        res.status(404).json({ error: 'Linked Tour not found' });
        return;
      }
    }

    if (vendorId) {
      const vendorExists = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendorExists) {
        res.status(404).json({ error: 'Linked Vendor not found' });
        return;
      }
    }

    const count = await prisma.operationalCost.count();
    const costReference = `OPCOST-${(count + 1).toString().padStart(4, '0')}`;

    const estimatedDecimal = new Prisma.Decimal(validated.estimatedCost);
    const actualDecimal = new Prisma.Decimal(validated.actualCost);

    const costDateObj = validated.costDate ? new Date(validated.costDate) : new Date();

    const cost = await prisma.operationalCost.create({
      data: {
        costReference,
        tourId,
        bookingPrepId,
        vendorId,
        costCategory: validated.costCategory.trim(),
        description: validated.description.trim(),
        estimatedCost: estimatedDecimal,
        actualCost: actualDecimal,
        currency: 'INR',
        paymentStatus: validated.paymentStatus || 'Pending',
        costDate: costDateObj,
        referenceNumber: sanitizeStr(validated.referenceNumber),
        notes: sanitizeStr(validated.notes),
        createdById,
      },
      include: {
        tour: { select: { id: true, tourReference: true } },
        vendor: { select: { id: true, companyName: true } },
      },
    });

    // Accounting Sync if requested
    if (validated.syncToAccounting && createdById) {
      const categoryId = await getOrCreateOperationalCategory();
      const expCount = await prisma.expense.count();
      const expenseNumber = `EXP-${new Date().getFullYear()}-${(expCount + 1).toString().padStart(5, '0')}`;

      const expense = await prisma.expense.create({
        data: {
          expenseNumber,
          title: `Operational Cost: ${cost.description}`,
          description: `Tour ${cost.tour?.tourReference || 'N/A'} - ${cost.costCategory}`,
          subCategory: cost.costCategory,
          vendorName: cost.vendor?.companyName || 'Operational Supplier',
          expenseDate: cost.costDate,
          amount: Number(actualDecimal),
          totalAmount: Number(actualDecimal),
          taxableAmount: Number(actualDecimal),
          gstApplicable: false,
          status: validated.paymentStatus === 'Paid' ? 'PAID' : 'APPROVED',
          categoryId,
          createdById,
        },
      });

      await prisma.operationalCost.update({
        where: { id: cost.id },
        data: { expenseId: expense.id },
      });
    }

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'OPERATIONAL_COST_ADDED',
      entity: 'OperationalCost',
      entityId: cost.id,
      details: `Added cost ${cost.costReference} (${cost.description}) amount INR ${cost.actualCost}`,
    });

    res.status(201).json({ cost, message: 'Operational cost created successfully' });
  } catch (error: any) {
    console.error('Error creating operational cost:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid cost input' });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to create operational cost' });
  }
};

// 3. GET /api/operations/costs/:id
export const getOperationalCostById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const cost = await prisma.operationalCost.findUnique({
      where: { id },
      include: {
        tour: { select: { id: true, tourReference: true, destination: true } },
        bookingPrep: { select: { id: true, bookingRef: true } },
        vendor: true,
        expense: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!cost) {
      res.status(404).json({ error: 'Operational cost record not found' });
      return;
    }

    res.status(200).json(cost);
  } catch (error: any) {
    console.error('Error fetching operational cost by ID:', error);
    res.status(500).json({ error: 'Failed to fetch operational cost details' });
  }
};

// 4. PUT /api/operations/costs/:id
export const updateOperationalCost = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validated = costSchema.partial().parse(req.body);

    const existing = await prisma.operationalCost.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Operational cost record not found' });
      return;
    }

    const estimatedDecimal = validated.estimatedCost !== undefined ? new Prisma.Decimal(validated.estimatedCost) : existing.estimatedCost;
    const actualDecimal = validated.actualCost !== undefined ? new Prisma.Decimal(validated.actualCost) : existing.actualCost;

    const updated = await prisma.operationalCost.update({
      where: { id },
      data: {
        tourId: validated.tourId !== undefined ? sanitizeStr(validated.tourId) : existing.tourId,
        bookingPrepId: validated.bookingPrepId !== undefined ? sanitizeStr(validated.bookingPrepId) : existing.bookingPrepId,
        vendorId: validated.vendorId !== undefined ? sanitizeStr(validated.vendorId) : existing.vendorId,
        costCategory: validated.costCategory !== undefined ? validated.costCategory.trim() : existing.costCategory,
        description: validated.description !== undefined ? validated.description.trim() : existing.description,
        estimatedCost: estimatedDecimal,
        actualCost: actualDecimal,
        paymentStatus: validated.paymentStatus !== undefined ? validated.paymentStatus : existing.paymentStatus,
        costDate: validated.costDate ? new Date(validated.costDate) : existing.costDate,
        referenceNumber: validated.referenceNumber !== undefined ? sanitizeStr(validated.referenceNumber) : existing.referenceNumber,
        notes: validated.notes !== undefined ? sanitizeStr(validated.notes) : existing.notes,
      },
      include: {
        tour: { select: { id: true, tourReference: true } },
        vendor: { select: { id: true, companyName: true } },
        expense: true,
      },
    });

    // Sync to linked Accounting expense if present
    if (updated.expenseId) {
      await prisma.expense.update({
        where: { id: updated.expenseId },
        data: {
          title: `Operational Cost: ${updated.description}`,
          amount: Number(updated.actualCost),
          totalAmount: Number(updated.actualCost),
          taxableAmount: Number(updated.actualCost),
          status: updated.paymentStatus === 'Paid' ? 'PAID' : 'APPROVED',
        },
      });
    }

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'OPERATIONAL_COST_UPDATED',
      entity: 'OperationalCost',
      entityId: updated.id,
      details: `Updated operational cost ${updated.costReference}`,
    });

    res.status(200).json({ cost: updated, message: 'Operational cost updated successfully' });
  } catch (error: any) {
    console.error('Error updating operational cost:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid cost input' });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to update operational cost' });
  }
};

// 5. PATCH /api/operations/costs/:id/status
export const updateCostStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { paymentStatus } = req.body;

    if (!paymentStatus) {
      res.status(400).json({ error: 'paymentStatus is required' });
      return;
    }

    const existing = await prisma.operationalCost.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Operational cost record not found' });
      return;
    }

    const updated = await prisma.operationalCost.update({
      where: { id },
      data: { paymentStatus },
    });

    if (updated.expenseId) {
      await prisma.expense.update({
        where: { id: updated.expenseId },
        data: {
          status: paymentStatus === 'Paid' ? 'PAID' : paymentStatus === 'Cancelled' ? 'CANCELLED' : 'APPROVED',
        },
      });
    }

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'OPERATIONAL_COST_STATUS_CHANGED',
      entity: 'OperationalCost',
      entityId: updated.id,
      details: `Changed cost payment status to ${paymentStatus}`,
    });

    res.status(200).json({ cost: updated, message: 'Payment status updated successfully' });
  } catch (error: any) {
    console.error('Error updating cost payment status:', error);
    res.status(500).json({ error: 'Failed to update cost payment status' });
  }
};

// 6. DELETE /api/operations/costs/:id
export const deleteOperationalCost = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (!id || typeof id !== 'string') {
      res.status(400).json({ error: 'Valid Operational Cost ID is required' });
      return;
    }

    const existing = await prisma.operationalCost.findUnique({
      where: { id },
      include: {
        expense: true,
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Operational cost record not found' });
      return;
    }

    // Delete operational cost record
    // The linked Expense (if present) is preserved in Accounting for financial audit compliance.
    await prisma.operationalCost.delete({
      where: { id },
    });

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'OPERATIONAL_COST_DELETED',
      entity: 'OperationalCost',
      entityId: id,
      details: `Deleted operational cost ${existing.costReference} (${existing.description})${
        existing.expenseId ? ' [Linked Accounting Expense preserved]' : ''
      }`,
    });

    res.status(200).json({
      message: 'Operational cost deleted successfully',
      deletedId: id,
    });
  } catch (error: any) {
    console.error('Error deleting operational cost:', error);
    res.status(500).json({ error: error.message || 'Failed to delete operational cost' });
  }
};
