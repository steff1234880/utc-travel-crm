import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { calculateGst } from '../services/gstService';

const prisma = new PrismaClient();

const configSchema = z.object({
  isEnabled: z.boolean(),
  defaultGstRate: z.number().min(0).max(100),
  gstin: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  companyAddress: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  stateCode: z.string().optional().nullable(),
  invoicePrefix: z.string().min(1),
  pricingMode: z.enum(['INCLUSIVE', 'EXCLUSIVE'])
});

export const getGstConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    let config = await prisma.gSTConfiguration.findFirst();
    if (!config) {
      config = await prisma.gSTConfiguration.create({
        data: {
          isEnabled: true,
          defaultGstRate: 5,
          invoicePrefix: 'INV-',
          pricingMode: 'EXCLUSIVE'
        }
      });
    }
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching GST config:', error);
    res.status(500).json({ error: 'Failed to fetch GST configuration' });
  }
};

export const updateGstConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = configSchema.parse(req.body);
    let config = await prisma.gSTConfiguration.findFirst();
    
    if (config) {
      config = await prisma.gSTConfiguration.update({
        where: { id: config.id },
        data: validatedData
      });
    } else {
      config = await prisma.gSTConfiguration.create({
        data: validatedData
      });
    }
    
    res.json({ success: true, data: config });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
    } else {
      console.error('Error updating GST config:', error);
      res.status(500).json({ error: 'Failed to update GST configuration' });
    }
  }
};

export const getGstDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        invoiceDate: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      };
    }

    const records = await prisma.gSTRecord.findMany({
      where: dateFilter,
      include: {
        transaction: {
          include: {
            customerPayment: {
              include: { customer: true, quotation: true, bookingPrep: true }
            }
          }
        }
      }
    });

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalGst = 0;

    records.forEach(r => {
      totalTaxable += r.taxableAmount;
      totalCgst += r.cgst;
      totalSgst += r.sgst;
      totalIgst += r.igst;
      totalGst += r.totalGst;
    });

    res.json({
      success: true,
      data: {
        totalTaxable,
        totalCgst,
        totalSgst,
        totalIgst,
        totalGst,
        records
      }
    });
  } catch (error) {
    console.error('Error fetching GST dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch GST dashboard data' });
  }
};

export const getGstRecords = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, customerId } = req.query;
    
    let whereClause: any = {};
    if (startDate && endDate) {
      whereClause.invoiceDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    // Simplistic customer filtering if provided via nested relation
    if (customerId) {
       whereClause.transaction = {
         customerPayment: {
           customerId: customerId as string
         }
       };
    }

    const records = await prisma.gSTRecord.findMany({
      where: whereClause,
      include: {
        transaction: {
          include: {
            customerPayment: {
              include: { customer: true, quotation: true, bookingPrep: true }
            }
          }
        }
      },
      orderBy: { invoiceDate: 'desc' }
    });

    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching GST records:', error);
    res.status(500).json({ error: 'Failed to fetch GST records' });
  }
};
