import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import path from 'path';

const createQuotationSchema = z.object({
  salesLeadId: z.string().uuid(),
  customerId: z.string().uuid(),
  validityDate: z.string(),
  packageId: z.string().uuid().optional(),
  destination: z.string().optional(),
  travelDates: z.string().optional(),
  duration: z.string().optional(),
  basePrice: z.number().min(0),
  additionalCharges: z.number().optional().default(0),
  discounts: z.number().optional().default(0),
  taxes: z.number().optional().default(0),
  currency: z.string().default('USD'),
  paymentTerms: z.string().optional(),
  termsConditions: z.string().optional(),
  internalNotes: z.string().optional(),
  
  // GST Fields
  gstApplicable: z.boolean().optional().default(true),
  gstType: z.string().optional().default('GST'),
  gstRate: z.number().optional().default(0),
  placeOfSupply: z.string().optional(),
  isInclusive: z.boolean().optional().default(false),
  isInterState: z.boolean().optional().default(false),
  items: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0)
  }))
});

export const createQuotation = async (req: Request, res: Response) => {
  try {
    const data = createQuotationSchema.parse(req.body);
    
    const itemsTotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const baseTotal = data.basePrice + itemsTotal + data.additionalCharges - data.discounts;
    
    let gstData = {
      taxableAmount: baseTotal,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTaxAmount: 0,
      totalAmount: baseTotal
    };

    if (data.gstApplicable && data.gstType === 'GST') {
      const gstService = require('../services/gstService');
      gstData = gstService.calculateGst(baseTotal, data.gstRate, data.isInclusive, data.isInterState);
    } else if (data.gstApplicable && data.gstType === 'EXEMPT') {
      const gstService = require('../services/gstService');
      gstData = gstService.calculateExempt(baseTotal);
    }

    const finalAmount = gstData.totalAmount;

    const quotationNumber = `QT-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        salesLeadId: data.salesLeadId,
        customerId: data.customerId,
        validityDate: new Date(data.validityDate),
        packageId: data.packageId,
        destination: data.destination,
        travelDates: data.travelDates,
        duration: data.duration,
        basePrice: data.basePrice,
        additionalCharges: data.additionalCharges,
        discounts: data.discounts,
        taxes: gstData.totalTaxAmount,
        finalAmount,
        currency: data.currency,
        
        gstApplicable: data.gstApplicable,
        gstType: data.gstType,
        gstRate: data.gstRate,
        taxableAmount: gstData.taxableAmount,
        cgstAmount: gstData.cgstAmount,
        sgstAmount: gstData.sgstAmount,
        igstAmount: gstData.igstAmount,
        totalTaxAmount: gstData.totalTaxAmount,
        placeOfSupply: data.placeOfSupply,

        paymentTerms: data.paymentTerms,
        termsConditions: data.termsConditions,
        internalNotes: data.internalNotes,
        items: {
          create: data.items.map(item => ({
            ...item,
            totalPrice: item.quantity * item.unitPrice
          }))
        },
        statusHistory: {
          create: {
            newStatus: 'DRAFT',
            remarks: 'Initial creation',
            updatedById: req.user!.userId
          }
        }
      },
      include: { items: true, customer: true }
    });

    res.status(201).json({ success: true, data: quotation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
    } else {
      res.status(500).json({ error: 'Failed to create quotation' });
    }
  }
};

export const getQuotations = async (req: Request, res: Response) => {
  try {
    const quotations = await prisma.quotation.findMany({
      include: {
        customer: true,
        salesLead: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: quotations });
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
};

export const updateQuotationStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, remarks } = req.body;

    const oldQuote = await prisma.quotation.findUnique({ where: { id } });
    if (!oldQuote) return res.status(404).json({ success: false, error: 'Not found' });

    const quote = await prisma.$transaction(async (tx) => {
      const updatedQuote = await tx.quotation.update({
        where: { id },
        data: {
          status,
          statusHistory: {
            create: {
              oldStatus: oldQuote.status,
              newStatus: status,
              remarks,
              updatedById: req.user!.userId
            }
          }
        }
      });

      if (status === 'ACCEPTED' || status === 'REJECTED') {
        const stageName = status === 'ACCEPTED' ? 'Won' : 'Lost';
        const targetStage = await tx.salesPipelineStage.findUnique({ where: { name: stageName } });
        if (targetStage && oldQuote.salesLeadId) {
          await tx.salesLead.update({
            where: { id: oldQuote.salesLeadId },
            data: { pipelineStageId: targetStage.id, status: status === 'ACCEPTED' ? 'WON' : 'LOST' }
          });
        }
      }

      return updatedQuote;
    });

    res.json({ success: true, data: quote });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Failed to update quotation status' });
  }
};

export const getQuotationById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const quote = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!quote) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: quote });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch quotation' });
  }
};

export const generateQuotationPdf = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const quote = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true, items: true }
    });

    if (!quote) return res.status(404).json({ success: false, error: 'Quotation not found' });

    // In a real application, you'd use a templating engine like EJS or Handlebars.
    // Here we use a basic HTML string for demonstration.
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Quotation ${quote.quotationNumber}</title>
          <style>
            body { 
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
              color: #333; 
              line-height: 1.6; 
              margin: 0;
              padding: 40px;
            }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .header-left h1 { color: #2563eb; margin: 0 0 5px 0; font-size: 32px; font-weight: 800; letter-spacing: -1px; }
            .header-left p { margin: 0; color: #64748b; font-size: 14px; }
            .header-right { text-align: right; }
            .header-right h2 { margin: 0; color: #0f172a; font-size: 24px; font-weight: 300; }
            .header-right p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; font-weight: 600; }
            
            .meta-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .meta-box { width: 48%; }
            .meta-box h3 { font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
            .meta-box p { margin: 0 0 5px 0; font-size: 15px; }
            .meta-box strong { color: #0f172a; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f8fafc; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; padding: 15px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
            td { padding: 15px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 600; }
            
            .totals-container { display: flex; justify-content: flex-end; margin-bottom: 40px; }
            .totals-table { width: 350px; }
            .totals-table tr td { padding: 10px 12px; border-bottom: none; }
            .totals-table tr td:last-child { text-align: right; font-weight: 600; }
            .totals-table .grand-total td { font-size: 18px; color: #2563eb; font-weight: 800; border-top: 2px solid #e2e8f0; padding-top: 15px; }
            
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
            .footer-grid { display: flex; justify-content: space-between; }
            .footer-col { width: 48%; }
            .footer-col h4 { margin: 0 0 8px 0; color: #0f172a; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <h1>Universal Travel Company</h1>
              <p>Premium Travel Experiences</p>
            </div>
            <div class="header-right">
              <h2>QUOTATION</h2>
              <p># ${quote.quotationNumber}</p>
            </div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-box">
              <h3>Prepared For</h3>
              <p><strong>${quote.customer.firstName} ${quote.customer.lastName || ''}</strong></p>
              <p>${quote.customer.email}</p>
              ${quote.customer.phone ? `<p>${quote.customer.phone}</p>` : ''}
            </div>
            <div class="meta-box text-right">
              <h3>Quotation Details</h3>
              <p>Date: <strong>${new Date().toLocaleDateString()}</strong></p>
              <p>Valid Until: <strong>${new Date(quote.validityDate).toLocaleDateString()}</strong></p>
              ${quote.destination ? `<p>Destination: <strong>${quote.destination}</strong></p>` : ''}
              ${quote.travelDates ? `<p>Travel Dates: <strong>${quote.travelDates}</strong></p>` : ''}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${quote.items.map(item => `
                <tr>
                  <td>
                    <div class="font-bold text-[#0f172a]">${item.title}</div>
                    ${item.description ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">${item.description}</div>` : ''}
                  </td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">$${item.unitPrice.toFixed(2)}</td>
                  <td class="text-right font-bold">$${item.totalPrice.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals-container">
            <table class="totals-table">
              <tr>
                <td>Subtotal</td>
                <td>$${(quote.finalAmount - quote.taxes + quote.discounts - quote.additionalCharges).toFixed(2)}</td>
              </tr>
              ${quote.additionalCharges > 0 ? `
              <tr>
                <td>Additional Charges</td>
                <td>$${quote.additionalCharges.toFixed(2)}</td>
              </tr>
              ` : ''}
              ${quote.taxes > 0 ? `
              <tr>
                <td>Taxes</td>
                <td>$${quote.taxes.toFixed(2)}</td>
              </tr>
              ` : ''}
              ${quote.discounts > 0 ? `
              <tr>
                <td>Discounts</td>
                <td style="color: #ef4444;">-$${quote.discounts.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr class="grand-total">
                <td>Grand Total</td>
                <td>$${quote.finalAmount.toFixed(2)} ${quote.currency}</td>
              </tr>
            </table>
          </div>
          
          <div class="footer">
            <div class="footer-grid">
              <div class="footer-col">
                <h4>Payment Terms</h4>
                <p>${quote.paymentTerms || 'Payment due upon acceptance.'}</p>
              </div>
              <div class="footer-col">
                <h4>Terms & Conditions</h4>
                <p>${quote.termsConditions || 'Standard booking terms apply. Prices subject to availability.'}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${quote.quotationNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
};

export const getQuotationsByLeadId = async (req: Request, res: Response) => {
  try {
    const leadId = req.params.leadId as string;
    const quotes = await prisma.quotation.findMany({
      where: { salesLeadId: leadId },
      include: {
        items: true,
        customer: true,
        bookingPrep: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { validityDate: 'desc' }
    });
    res.json({ success: true, data: quotes });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch quotations' });
  }
};

export const updateQuotation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = req.body; // Bypassing strict zod schema for edit to avoid partial issues or redefine it
    
    // Calculate final amount with safety fallbacks for optional fields
    const basePrice = Number(data.basePrice) || 0;
    const additionalCharges = Number(data.additionalCharges) || 0;
    const discounts = Number(data.discounts) || 0;
    const itemsTotal = data.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);

    const baseTotal = basePrice + itemsTotal + additionalCharges - discounts;
    
    let gstData = {
      taxableAmount: baseTotal,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTaxAmount: 0,
      totalAmount: baseTotal
    };

    const gstApplicable = data.gstApplicable !== undefined ? Boolean(data.gstApplicable) : true;
    const gstType = data.gstType || 'GST';
    const gstRate = Number(data.gstRate) || 0;
    const isInclusive = Boolean(data.isInclusive);
    const isInterState = Boolean(data.isInterState);

    if (gstApplicable && gstType === 'GST') {
      const gstService = require('../services/gstService');
      gstData = gstService.calculateGst(baseTotal, gstRate, isInclusive, isInterState);
    } else if (gstApplicable && gstType === 'EXEMPT') {
      const gstService = require('../services/gstService');
      gstData = gstService.calculateExempt(baseTotal);
    }

    const finalAmount = gstData.totalAmount;

    const existingQuote = await prisma.quotation.findUnique({ where: { id }, include: { items: true } });
    if (!existingQuote) return res.status(404).json({ success: false, error: 'Not found' });

    // Use transaction to update quote and items
    const updatedQuote = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      
      // Update Quote & recreate items
      return await tx.quotation.update({
        where: { id },
        data: {
          validityDate: new Date(data.validityDate),
          packageId: data.packageId,
          destination: data.destination,
          travelDates: data.travelDates,
          duration: data.duration,
          basePrice,
          additionalCharges,
          discounts,
          taxes: gstData.totalTaxAmount,
          finalAmount,
          currency: data.currency,
          
          gstApplicable,
          gstType,
          gstRate,
          taxableAmount: gstData.taxableAmount,
          cgstAmount: gstData.cgstAmount,
          sgstAmount: gstData.sgstAmount,
          igstAmount: gstData.igstAmount,
          totalTaxAmount: gstData.totalTaxAmount,
          placeOfSupply: data.placeOfSupply,

          paymentTerms: data.paymentTerms,
          termsConditions: data.termsConditions,
          items: {
            create: data.items.map((item: any) => ({
              title: item.title,
              description: item.description,
              quantity: Number(item.quantity) || 1,
              unitPrice: Number(item.unitPrice) || 0,
              totalPrice: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)
            }))
          },
          statusHistory: {
            create: {
              oldStatus: existingQuote.status,
              newStatus: existingQuote.status,
              remarks: 'Quotation Updated',
              updatedById: req.user!.userId
            }
          }
        },
        include: { items: true, customer: true }
      });
    });

    res.json({ success: true, data: updatedQuote });
  } catch (error: any) {
    console.error('Failed to update quotation:', error);
    res.status(400).json({ success: false, error: error.message || 'Failed to update quotation', details: error });
  }
};

export const deleteQuotation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.quotation.delete({ where: { id } });
    res.json({ success: true, message: 'Quotation deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete quotation' });
  }
};

export const getPublicQuotation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const quote = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!quote) return res.status(404).json({ success: false, error: 'Quotation not found' });
    
    // We intentionally exclude internalNotes or other sensitive fields if any exist
    res.json({ success: true, data: quote });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch public quotation' });
  }
};

export const respondToQuotation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, remarks } = req.body;

    if (status !== 'ACCEPTED' && status !== 'REJECTED') {
      return res.status(400).json({ success: false, error: 'Invalid response status' });
    }

    const existingQuote = await prisma.quotation.findUnique({ where: { id } });
    if (!existingQuote) return res.status(404).json({ success: false, error: 'Quotation not found' });

    if (existingQuote.status === 'ACCEPTED' || existingQuote.status === 'REJECTED') {
      return res.status(400).json({ success: false, error: 'Quotation has already been responded to' });
    }

    const updatedQuote = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.update({
        where: { id },
        data: {
          status,
          statusHistory: {
            create: {
              oldStatus: existingQuote.status,
              newStatus: status,
              remarks: remarks || `Customer ${status.toLowerCase()} the quotation.`,
              updatedById: existingQuote.customerId
            }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          userId: req.user?.userId || null,
          userEmail: req.user?.email || 'CUSTOMER',
          action: `QUOTATION_${status}`,
          module: 'CRM',
          recordId: q.id,
          details: `Quotation ${q.quotationNumber} was ${status.toLowerCase()}`
        }
      });

      const stageName = status === 'ACCEPTED' ? 'Won' : 'Lost';
      const targetStage = await tx.salesPipelineStage.findUnique({ where: { name: stageName } });
      if (targetStage && existingQuote.salesLeadId) {
        await tx.salesLead.update({
          where: { id: existingQuote.salesLeadId },
          data: { pipelineStageId: targetStage.id, status: status === 'ACCEPTED' ? 'WON' : 'LOST' }
        });

        await tx.auditLog.create({
          data: {
            userId: req.user?.userId || null,
            userEmail: req.user?.email || 'SYSTEM',
            action: `LEAD_${status === 'ACCEPTED' ? 'WON' : 'LOST'}`,
            module: 'CRM',
            recordId: existingQuote.salesLeadId,
            details: `Lead stage changed to ${stageName}`
          }
        });
      }
      return q;
    });

    res.json({ success: true, data: updatedQuote });
  } catch (error) {
    console.error('Failed to respond to quotation:', error);
    res.status(500).json({ success: false, error: 'Failed to submit quotation response' });
  }
};

export const convertQuotationToBooking = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!quotation) return res.status(404).json({ success: false, error: 'Quotation not found' });
    if (quotation.status !== 'ACCEPTED') return res.status(400).json({ success: false, error: 'Quotation must be ACCEPTED before converting to booking' });

    // Check for existing booking
    const existingBooking = await prisma.bookingPreparation.findUnique({ where: { quotationId: id } });
    if (existingBooking) {
      return res.status(400).json({ success: false, error: 'Booking already exists for this quotation', bookingId: existingBooking.id });
    }

    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) return res.status(403).json({ success: false, error: 'Unauthorized: Only employees can create bookings' });

    const bookingRef = `BKG-${Date.now()}`;

    const booking = await prisma.$transaction(async (tx) => {
      const b = await tx.bookingPreparation.create({
        data: {
          bookingRef,
          quotationId: id,
          customerId: quotation.customerId,
          preparedById: employee.id,
          status: 'PENDING',
          gstApplicable: quotation.gstApplicable,
          gstType: quotation.gstType,
          gstRate: quotation.gstRate,
          taxableAmount: quotation.taxableAmount,
          cgstAmount: quotation.cgstAmount,
          sgstAmount: quotation.sgstAmount,
          igstAmount: quotation.igstAmount,
          totalTaxAmount: quotation.totalTaxAmount,
          placeOfSupply: quotation.placeOfSupply
        }
      });

      await tx.auditLog.create({
        data: {
          userId,
          userEmail: req.user!.email || 'unknown',
          action: 'CONVERT_TO_BOOKING',
          module: 'CRM',
          recordId: b.id,
          details: `Quotation ${quotation.quotationNumber} converted to Booking ${bookingRef}`,
        }
      });

      return b;
    });

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Failed to convert quotation to booking:', error);
    res.status(500).json({ success: false, error: 'Failed to convert quotation to booking' });
  }
};
