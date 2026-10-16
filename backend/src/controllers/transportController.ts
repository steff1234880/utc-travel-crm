import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { logOperationsActivity } from '../utils/auditLogger';

const transportSchema = z.object({
  tourId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  transportType: z.string().min(1, 'Transport type is required'), // Car, Bus, Van, Train transfer, Other
  vehicleServiceNumber: z.string().optional().nullable(),
  pickupLocation: z.string().min(1, 'Pickup location is required'),
  dropLocation: z.string().min(1, 'Drop location is required'),
  pickupDateTime: z.string().min(1, 'Pickup date & time is required'),
  dropDateTime: z.string().optional().nullable(),
  passengerCount: z.coerce.number().int().min(1).optional().default(1),
  bookingReference: z.string().optional().nullable(),
  confirmationNumber: z.string().optional().nullable(),
  reservationStatus: z.string().optional().default('Requested'), // Requested, Pending, Confirmed, Modified, Cancelled, Completed
  estimatedCost: z.coerce.number().optional().default(0),
  actualCost: z.coerce.number().optional().default(0),
  internalNotes: z.string().optional().nullable(),
});

const sanitizeStr = (val: any): string | null => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

// 1. GET /api/operations/transport
export const getTransportReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, tourId, customerId, vendorId, transportType, status, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (search) {
      const q = (search as string).trim();
      whereClause.OR = [
        { reservationNumber: { contains: q, mode: 'insensitive' } },
        { pickupLocation: { contains: q, mode: 'insensitive' } },
        { dropLocation: { contains: q, mode: 'insensitive' } },
        { vehicleServiceNumber: { contains: q, mode: 'insensitive' } },
        { bookingReference: { contains: q, mode: 'insensitive' } },
        { confirmationNumber: { contains: q, mode: 'insensitive' } },
        { tour: { tourReference: { contains: q, mode: 'insensitive' } } },
        { vendor: { companyName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (tourId) whereClause.tourId = tourId as string;
    if (customerId) whereClause.customerId = customerId as string;
    if (vendorId) whereClause.vendorId = vendorId as string;
    if (transportType && transportType !== 'ALL') whereClause.transportType = transportType as string;
    if (status && status !== 'ALL') whereClause.reservationStatus = status as string;

    const [reservations, total] = await Promise.all([
      prisma.transportReservation.findMany({
        where: whereClause,
        orderBy: { pickupDateTime: 'asc' },
        skip,
        take: limitNum,
        include: {
          tour: { select: { id: true, tourReference: true, destination: true } },
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          vendor: { select: { id: true, vendorCode: true, companyName: true, phone: true } },
        },
      }),
      prisma.transportReservation.count({ where: whereClause }),
    ]);

    res.status(200).json({
      reservations,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching transport reservations:', error);
    res.status(500).json({ error: 'Failed to fetch transport reservations' });
  }
};

// 2. POST /api/operations/transport
export const createTransportReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = transportSchema.parse(req.body);

    const tourId = sanitizeStr(validated.tourId);
    let customerId = sanitizeStr(validated.customerId);
    const vendorId = sanitizeStr(validated.vendorId);

    // If tourId is provided but customerId isn't, pull customerId from Tour
    if (tourId && !customerId) {
      const tour = await prisma.tour.findUnique({ where: { id: tourId } });
      if (tour) customerId = tour.customerId;
    }

    const pickupDateObj = new Date(validated.pickupDateTime);
    if (isNaN(pickupDateObj.getTime())) {
      res.status(400).json({ error: 'Invalid Pickup Date & Time' });
      return;
    }

    let dropDateObj: Date | null = null;
    if (validated.dropDateTime) {
      dropDateObj = new Date(validated.dropDateTime);
      if (isNaN(dropDateObj.getTime())) {
        res.status(400).json({ error: 'Invalid Drop Date & Time' });
        return;
      }
      if (pickupDateObj > dropDateObj) {
        res.status(400).json({ error: 'Pickup Date & Time cannot be after Drop Date & Time' });
        return;
      }
    }

    const count = await prisma.transportReservation.count();
    const reservationNumber = `TRANS-${(count + 1).toString().padStart(4, '0')}`;

    const reservation = await prisma.transportReservation.create({
      data: {
        reservationNumber,
        tourId,
        customerId,
        vendorId,
        transportType: validated.transportType.trim(),
        vehicleServiceNumber: sanitizeStr(validated.vehicleServiceNumber),
        pickupLocation: validated.pickupLocation.trim(),
        dropLocation: validated.dropLocation.trim(),
        pickupDateTime: pickupDateObj,
        dropDateTime: dropDateObj,
        passengerCount: Math.max(1, validated.passengerCount),
        bookingReference: sanitizeStr(validated.bookingReference),
        confirmationNumber: sanitizeStr(validated.confirmationNumber),
        reservationStatus: validated.reservationStatus || 'Requested',
        estimatedCost: new Prisma.Decimal(validated.estimatedCost || 0),
        actualCost: new Prisma.Decimal(validated.actualCost || 0),
        internalNotes: sanitizeStr(validated.internalNotes),
      },
      include: {
        tour: { select: { id: true, tourReference: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        vendor: { select: { id: true, companyName: true } },
      },
    });

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'TRANSPORT_RESERVATION_CREATED',
      entity: 'TransportReservation',
      entityId: reservation.id,
      details: `Created transport reservation ${reservation.reservationNumber} (${reservation.transportType})`,
    });

    res.status(201).json({ reservation, message: 'Transport reservation created successfully' });
  } catch (error: any) {
    console.error('Error creating transport reservation:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid transport input' });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to create transport reservation' });
  }
};

// 3. GET /api/operations/transport/:id
export const getTransportById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const reservation = await prisma.transportReservation.findUnique({
      where: { id },
      include: {
        tour: { select: { id: true, tourReference: true, destination: true, startDate: true, endDate: true } },
        customer: true,
        vendor: true,
      },
    });

    if (!reservation) {
      res.status(404).json({ error: 'Transport reservation not found' });
      return;
    }

    res.status(200).json(reservation);
  } catch (error: any) {
    console.error('Error fetching transport reservation by ID:', error);
    res.status(500).json({ error: 'Failed to fetch transport details' });
  }
};

// 4. PUT /api/operations/transport/:id
export const updateTransportReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validated = transportSchema.partial().parse(req.body);

    const existing = await prisma.transportReservation.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Transport reservation not found' });
      return;
    }

    let pickupDateObj = existing.pickupDateTime;
    if (validated.pickupDateTime) {
      pickupDateObj = new Date(validated.pickupDateTime);
      if (isNaN(pickupDateObj.getTime())) {
        res.status(400).json({ error: 'Invalid Pickup Date & Time' });
        return;
      }
    }

    let dropDateObj = existing.dropDateTime;
    if (validated.dropDateTime !== undefined) {
      dropDateObj = validated.dropDateTime ? new Date(validated.dropDateTime) : null;
      if (dropDateObj && isNaN(dropDateObj.getTime())) {
        res.status(400).json({ error: 'Invalid Drop Date & Time' });
        return;
      }
    }

    if (dropDateObj && pickupDateObj > dropDateObj) {
      res.status(400).json({ error: 'Pickup Date & Time cannot be after Drop Date & Time' });
      return;
    }

    const updated = await prisma.transportReservation.update({
      where: { id },
      data: {
        tourId: validated.tourId !== undefined ? sanitizeStr(validated.tourId) : existing.tourId,
        customerId: validated.customerId !== undefined ? sanitizeStr(validated.customerId) : existing.customerId,
        vendorId: validated.vendorId !== undefined ? sanitizeStr(validated.vendorId) : existing.vendorId,
        transportType: validated.transportType !== undefined ? validated.transportType.trim() : existing.transportType,
        vehicleServiceNumber: validated.vehicleServiceNumber !== undefined ? sanitizeStr(validated.vehicleServiceNumber) : existing.vehicleServiceNumber,
        pickupLocation: validated.pickupLocation !== undefined ? validated.pickupLocation.trim() : existing.pickupLocation,
        dropLocation: validated.dropLocation !== undefined ? validated.dropLocation.trim() : existing.dropLocation,
        pickupDateTime: pickupDateObj,
        dropDateTime: dropDateObj,
        passengerCount: validated.passengerCount !== undefined ? Math.max(1, validated.passengerCount) : existing.passengerCount,
        bookingReference: validated.bookingReference !== undefined ? sanitizeStr(validated.bookingReference) : existing.bookingReference,
        confirmationNumber: validated.confirmationNumber !== undefined ? sanitizeStr(validated.confirmationNumber) : existing.confirmationNumber,
        reservationStatus: validated.reservationStatus !== undefined ? validated.reservationStatus : existing.reservationStatus,
        estimatedCost: validated.estimatedCost !== undefined ? new Prisma.Decimal(validated.estimatedCost) : existing.estimatedCost,
        actualCost: validated.actualCost !== undefined ? new Prisma.Decimal(validated.actualCost) : existing.actualCost,
        internalNotes: validated.internalNotes !== undefined ? sanitizeStr(validated.internalNotes) : existing.internalNotes,
      },
      include: {
        tour: { select: { id: true, tourReference: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
        vendor: { select: { id: true, companyName: true } },
      },
    });

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'TRANSPORT_RESERVATION_UPDATED',
      entity: 'TransportReservation',
      entityId: updated.id,
      details: `Updated transport reservation ${updated.reservationNumber}`,
    });

    res.status(200).json({ reservation: updated, message: 'Transport reservation updated successfully' });
  } catch (error: any) {
    console.error('Error updating transport reservation:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid transport input' });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to update transport reservation' });
  }
};

// 5. PATCH /api/operations/transport/:id/status
export const updateTransportStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    const existing = await prisma.transportReservation.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Transport reservation not found' });
      return;
    }

    const updated = await prisma.transportReservation.update({
      where: { id },
      data: { reservationStatus: status },
    });

    await logOperationsActivity({
      userId: req.user?.userId,
      action: 'TRANSPORT_STATUS_CHANGED',
      entity: 'TransportReservation',
      entityId: updated.id,
      details: `Changed transport reservation status of ${updated.reservationNumber} to ${status}`,
    });

    res.status(200).json({ reservation: updated, message: 'Transport status updated successfully' });
  } catch (error: any) {
    console.error('Error updating transport status:', error);
    res.status(500).json({ error: 'Failed to update transport status' });
  }
};
