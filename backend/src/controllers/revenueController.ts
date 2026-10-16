import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const revenueSchema = z.object({
  customerId: z.string().uuid(),
  bookingPrepId: z.string().uuid().optional(),
  quotationId: z.string().uuid().optional(),
  packageId: z.string().uuid().optional(),
  amount: z.number().positive(),
  revenueType: z.enum(['PACKAGE', 'CUSTOMIZED_TOUR', 'BOOKING_SERVICE', 'OTHER_SERVICE']),
  paymentId: z.string().uuid().optional(),
  paymentStatus: z.string(),
  gstStatus: z.enum(['GST_INCLUDED', 'NON_GST']),
});

export const createRevenueRecord = async (req: Request, res: Response) => {
  try {
    const validatedData = revenueSchema.parse(req.body);
    const userId = (req as any).user.id;

    const employee = await prisma.employee.findUnique({
      where: { userId }
    });

    if (!employee) {
      return res.status(403).json({ success: false, error: 'User is not an employee' });
    }

    if (validatedData.paymentId) {
      const existing = await prisma.revenueRecord.findUnique({
        where: { paymentId: validatedData.paymentId }
      });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Revenue already recorded for this payment' });
      }
    }

    const referenceNumber = `REV-${Date.now()}`;

    const revenue = await prisma.revenueRecord.create({
      data: {
        ...validatedData,
        referenceNumber,
        createdById: employee.id,
      },
      include: {
        customer: true,
        package: true,
      }
    });

    res.status(201).json({ success: true, data: revenue });
  } catch (error: any) {
    console.error('Error creating revenue:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: (error as any).errors });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getRevenueRecords = async (req: Request, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '10', 
      startDate, 
      endDate, 
      revenueType, 
      customerId, 
      packageId,
      search 
    } = req.query;

    const pageNumber = parseInt(page as string);
    const pageSize = parseInt(limit as string);
    const skip = (pageNumber - 1) * pageSize;

    const where: Prisma.RevenueRecordWhereInput = {};

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (revenueType) where.revenueType = revenueType as string;
    if (customerId) where.customerId = customerId as string;
    if (packageId) where.packageId = packageId as string;

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search as string, mode: 'insensitive' } },
        { customer: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    const [revenues, total] = await Promise.all([
      prisma.revenueRecord.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          customer: true,
          package: true,
          createdBy: {
            include: { user: true }
          }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.revenueRecord.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: revenues,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching revenues:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getRevenueSummary = async (req: Request, res: Response) => {
  try {
    const revenues = await prisma.revenueRecord.findMany({
      where: {
        paymentStatus: { not: 'FAILED' } // exclude failed transactions
      }
    });

    const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    const gstRevenue = revenues.filter(r => r.gstStatus === 'GST_INCLUDED').reduce((sum, r) => sum + r.amount, 0);
    const nonGstRevenue = revenues.filter(r => r.gstStatus === 'NON_GST').reduce((sum, r) => sum + r.amount, 0);
    
    // Monthly Calculation (Current Year)
    const currentYear = new Date().getFullYear();
    const currentYearRevenues = revenues.filter(r => new Date(r.date).getFullYear() === currentYear);
    const monthlyRevenue = Array(12).fill(0);
    currentYearRevenues.forEach(r => {
      const month = new Date(r.date).getMonth();
      monthlyRevenue[month] += r.amount;
    });

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        gstRevenue,
        nonGstRevenue,
        monthlyRevenue
      }
    });
  } catch (error) {
    console.error('Error getting revenue summary:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getRevenueReports = async (req: Request, res: Response) => {
  try {
    const { groupBy } = req.query; // 'package', 'customer', 'type'

    let result;

    if (groupBy === 'package') {
      const grouped = await prisma.revenueRecord.groupBy({
        by: ['packageId'],
        _sum: { amount: true },
        where: { packageId: { not: null }, paymentStatus: { not: 'FAILED' } }
      });
      
      const packages = await prisma.travelPackage.findMany({
        where: { id: { in: grouped.map(g => g.packageId!) } },
        select: { id: true, title: true }
      });

      result = grouped.map(g => ({
        packageId: g.packageId,
        packageTitle: packages.find(p => p.id === g.packageId)?.title || 'Unknown',
        totalRevenue: g._sum.amount || 0
      }));
    } else if (groupBy === 'customer') {
      const grouped = await prisma.revenueRecord.groupBy({
        by: ['customerId'],
        _sum: { amount: true },
        where: { paymentStatus: { not: 'FAILED' } }
      });
      
      const customers = await prisma.customer.findMany({
        where: { id: { in: grouped.map(g => g.customerId) } },
        select: { id: true, firstName: true, lastName: true, email: true }
      });

      result = grouped.map(g => {
        const c = customers.find(c => c.id === g.customerId);
        return {
          customerId: g.customerId,
          customerName: c ? `${c.firstName} ${c.lastName || ''}`.trim() : 'Unknown',
          email: c?.email,
          totalRevenue: g._sum.amount || 0
        };
      });
    } else {
       const grouped = await prisma.revenueRecord.groupBy({
        by: ['revenueType'],
        _sum: { amount: true },
        where: { paymentStatus: { not: 'FAILED' } }
      });
      result = grouped.map(g => ({
        revenueType: g.revenueType,
        totalRevenue: g._sum.amount || 0
      }));
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error generating revenue reports:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getRevenueDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const revenue = await prisma.revenueRecord.findUnique({
      where: { id: id as string },
      include: {
        customer: true,
        package: true,
        bookingPrep: true,
        quotation: true,
        payment: {
          include: {
            transaction: true
          }
        },
        createdBy: {
          include: { user: true }
        }
      }
    });

    if (!revenue) {
      return res.status(404).json({ success: false, error: 'Revenue record not found' });
    }

    res.status(200).json({ success: true, data: revenue });
  } catch (error) {
    console.error('Error fetching revenue details:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateRevenueRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateSchema = z.object({
      paymentStatus: z.string().optional(),
      gstStatus: z.enum(['GST_INCLUDED', 'NON_GST']).optional(),
    });

    const validatedData = updateSchema.parse(req.body);

    const revenue = await prisma.revenueRecord.update({
      where: { id: id as string },
      data: validatedData
    });

    res.status(200).json({ success: true, data: revenue });
  } catch (error: any) {
    console.error('Error updating revenue:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: (error as any).errors });
    }
    if (error.code === 'P2025') {
        return res.status(404).json({ success: false, error: 'Revenue record not found' });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
