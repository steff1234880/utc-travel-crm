import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const createCustomerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
});

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        enquiries: {
          orderBy: { createdAt: 'desc' }
        },
        salesLeads: {
          include: { pipelineStage: true, assignedTo: true },
          orderBy: { createdAt: 'desc' }
        },
        quotations: {
          orderBy: { createdAt: 'desc' }
        },
        bookingPreps: {
          orderBy: { createdAt: 'desc' }
        },
        tours: {
          orderBy: { createdAt: 'desc' }
        },
        groupTourBookings: {
          include: { groupTour: true },
          orderBy: { createdAt: 'desc' }
        },
        payments: {
          include: { transaction: true }
        }
      }
    });
    if (!customer) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch customer' });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const data = createCustomerSchema.parse(req.body);
    const customer = await prisma.customer.create({ data });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Failed to create customer', details: error });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const data = createCustomerSchema.partial().parse(req.body);
    const customer = await prisma.customer.update({
      where: { id },
      data
    });
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Failed to update customer', details: error });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookingPreps: true,
            groupTourBookings: true,
            tours: true,
            payments: true,
            refunds: true,
            revenueRecords: true,
            hotelReservations: true,
            transportReservations: true,
            operationsDocuments: true,
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    // 1. Check for protected financial/operational records
    const counts = customer._count;
    const protectedList: string[] = [];
    if (counts.bookingPreps > 0) protectedList.push(`${counts.bookingPreps} Booking Prep(s)`);
    if (counts.groupTourBookings > 0) protectedList.push(`${counts.groupTourBookings} Group Tour Booking(s)`);
    if (counts.tours > 0) protectedList.push(`${counts.tours} Tour(s)`);
    if (counts.payments > 0) protectedList.push(`${counts.payments} Customer Payment(s)`);
    if (counts.refunds > 0) protectedList.push(`${counts.refunds} Refund(s)`);
    if (counts.revenueRecords > 0) protectedList.push(`${counts.revenueRecords} Revenue Record(s)`);
    if (counts.hotelReservations > 0) protectedList.push(`${counts.hotelReservations} Hotel Reservation(s)`);
    if (counts.transportReservations > 0) protectedList.push(`${counts.transportReservations} Transport Reservation(s)`);
    if (counts.operationsDocuments > 0) protectedList.push(`${counts.operationsDocuments} Operations Document(s)`);

    if (protectedList.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete customer because protected operational/financial records exist (${protectedList.join(', ')}). Customer data has been kept safe.`
      });
    }

    // 2. Perform safe atomic deletion of removable CRM records and Customer
    await prisma.$transaction(async (tx) => {
      // Find all sales lead IDs belonging to customer
      const salesLeads = await tx.salesLead.findMany({
        where: { customerId: id },
        select: { id: true }
      });
      const salesLeadIds = salesLeads.map(l => l.id);

      // Find all enquiry IDs belonging to customer
      const enquiries = await tx.enquiry.findMany({
        where: { customerId: id },
        select: { id: true }
      });
      const enquiryIds = enquiries.map(e => e.id);

      // Find all quotation IDs belonging directly to customer or to customer's sales leads
      const quotations = await tx.quotation.findMany({
        where: {
          OR: [
            { customerId: id },
            ...(salesLeadIds.length > 0 ? [{ salesLeadId: { in: salesLeadIds } }] : [])
          ]
        },
        select: { id: true }
      });
      const quotationIds = quotations.map(q => q.id);

      // Delete quotations
      if (quotationIds.length > 0) {
        await tx.quotation.deleteMany({
          where: { id: { in: quotationIds } }
        });
      }

      // Delete follow-ups linked to these sales leads or enquiries
      if (salesLeadIds.length > 0 || enquiryIds.length > 0) {
        await tx.followUp.deleteMany({
          where: {
            OR: [
              ...(salesLeadIds.length > 0 ? [{ salesLeadId: { in: salesLeadIds } }] : []),
              ...(enquiryIds.length > 0 ? [{ enquiryId: { in: enquiryIds } }] : [])
            ]
          }
        });
      }

      // Delete sales leads for customer
      if (salesLeadIds.length > 0) {
        await tx.salesLead.deleteMany({
          where: { customerId: id }
        });
      }

      // Delete enquiries for customer
      if (enquiryIds.length > 0) {
        await tx.enquiry.deleteMany({
          where: { customerId: id }
        });
      }

      // Finally delete customer
      await tx.customer.delete({
        where: { id }
      });
    });

    return res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    if (error?.code === 'P2003' || error?.code === 'P2014') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete customer while protected records (Bookings, Payments, Tours, etc.) exist.'
      });
    }
    return res.status(500).json({ success: false, error: 'Failed to delete customer' });
  }
};


