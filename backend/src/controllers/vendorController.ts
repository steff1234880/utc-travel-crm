import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { logOperationsActivity } from '../utils/auditLogger';

const vendorSchema = z.object({
  companyName: z.string().min(1, 'Company Name is required'),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  serviceType: z.string().min(1, 'Service Type is required'), // Hotel, Transport Provider, Airline, Activity Provider, Local Guide, Other Supplier
  paymentTerms: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

// Helper for string sanitization
const sanitizeStr = (val: any): string | null => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

// 1. GET /api/operations/vendors
export const getVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, serviceType, status, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (search) {
      const q = (search as string).trim();
      whereClause.OR = [
        { companyName: { contains: q, mode: 'insensitive' } },
        { vendorCode: { contains: q, mode: 'insensitive' } },
        { contactPerson: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (serviceType && serviceType !== 'ALL') {
      whereClause.serviceType = serviceType as string;
    }

    if (status && status !== 'ALL') {
      if (status === 'ACTIVE' || status === 'true') whereClause.isActive = true;
      if (status === 'INACTIVE' || status === 'false') whereClause.isActive = false;
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          _count: {
            select: {
              hotelReservations: true,
              transportReservations: true,
              operationalCosts: true,
            },
          },
        },
      }),
      prisma.vendor.count({ where: whereClause }),
    ]);

    res.status(200).json({
      vendors,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors list' });
  }
};

// 2. POST /api/operations/vendors
export const createVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = vendorSchema.parse(req.body);

    const count = await prisma.vendor.count();
    const vendorCode = `VEND-${(count + 1).toString().padStart(4, '0')}`;

    const vendor = await prisma.vendor.create({
      data: {
        vendorCode,
        companyName: validated.companyName.trim(),
        contactPerson: sanitizeStr(validated.contactPerson),
        phone: sanitizeStr(validated.phone),
        email: sanitizeStr(validated.email),
        address: sanitizeStr(validated.address),
        serviceType: validated.serviceType.trim(),
        paymentTerms: sanitizeStr(validated.paymentTerms),
        internalNotes: sanitizeStr(validated.internalNotes),
        isActive: validated.isActive ?? true,
      },
    });

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'VENDOR_CREATED',
      entity: 'Vendor',
      entityId: vendor.id,
      details: `Created vendor ${vendor.companyName} (${vendor.vendorCode})`,
    });

    res.status(201).json({ vendor, message: 'Vendor created successfully' });
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid vendor input' });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to create vendor' });
  }
};

// 3. GET /api/operations/vendors/:id
export const getVendorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        hotelReservations: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            tour: { select: { id: true, tourReference: true, destination: true } },
            customer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        transportReservations: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            tour: { select: { id: true, tourReference: true, destination: true } },
            customer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        operationalCosts: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            tour: { select: { id: true, tourReference: true, destination: true } },
          },
        },
      },
    });

    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    res.status(200).json(vendor);
  } catch (error: any) {
    console.error('Error fetching vendor by ID:', error);
    res.status(500).json({ error: 'Failed to fetch vendor details' });
  }
};

// 4. PUT /api/operations/vendors/:id
export const updateVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validated = vendorSchema.partial().parse(req.body);

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        companyName: validated.companyName !== undefined ? validated.companyName.trim() : existing.companyName,
        contactPerson: validated.contactPerson !== undefined ? sanitizeStr(validated.contactPerson) : existing.contactPerson,
        phone: validated.phone !== undefined ? sanitizeStr(validated.phone) : existing.phone,
        email: validated.email !== undefined ? sanitizeStr(validated.email) : existing.email,
        address: validated.address !== undefined ? sanitizeStr(validated.address) : existing.address,
        serviceType: validated.serviceType !== undefined ? validated.serviceType.trim() : existing.serviceType,
        paymentTerms: validated.paymentTerms !== undefined ? sanitizeStr(validated.paymentTerms) : existing.paymentTerms,
        internalNotes: validated.internalNotes !== undefined ? sanitizeStr(validated.internalNotes) : existing.internalNotes,
        isActive: validated.isActive !== undefined ? validated.isActive : existing.isActive,
      },
    });

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'VENDOR_UPDATED',
      entity: 'Vendor',
      entityId: updated.id,
      details: `Updated vendor details for ${updated.companyName}`,
    });

    res.status(200).json({ vendor: updated, message: 'Vendor updated successfully' });
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid vendor input' });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to update vendor' });
  }
};

// 5. PATCH /api/operations/vendors/:id/status
export const updateVendorStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'isActive boolean flag is required' });
      return;
    }

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: { isActive },
    });

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'VENDOR_STATUS_CHANGED',
      entity: 'Vendor',
      entityId: updated.id,
      details: `Changed vendor status of ${updated.companyName} to ${isActive ? 'Active' : 'Inactive'}`,
    });

    res.status(200).json({ vendor: updated, message: `Vendor ${isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (error: any) {
    console.error('Error toggling vendor status:', error);
    res.status(500).json({ error: 'Failed to update vendor status' });
  }
};
