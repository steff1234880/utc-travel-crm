import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const sanitizeStr = (str?: string | null) => (str ? str.trim() : undefined);

// Helper function to auto-generate Reference GT-YYYY-XXXX
const generateGroupTourRef = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `GT-${year}-`;
  const count = await prisma.groupTour.count();
  const nextNum = (count + 1).toString().padStart(4, '0');
  return `${prefix}${nextNum}`;
};

// Zod Schema for Group Tour Creation / Update
const groupTourSchema = z.object({
  packageId: z.string().optional().nullable(),
  title: z.string().min(2, 'Title is required'),
  destination: z.string().min(2, 'Destination is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  pricePerPerson: z.number().min(0, 'Price per person must be >= 0'),
  totalSlots: z.number().min(1, 'Total slots must be >= 1'),
  bookingDeadline: z.string().min(1, 'Booking deadline is required'),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  status: z.enum(['Open', 'Almost Full', 'Full', 'Completed', 'Cancelled']).optional(),
  pricingVars: z.array(z.object({
    title: z.string(),
    adultPrice: z.number().optional(),
    child6to17Price: z.number().optional(),
    child2to5Price: z.number().optional(),
    infantPrice: z.number().optional(),
  })).optional(),
});

// Zod Schema for Customer Joining Group Tour
const joinGroupTourSchema = z.object({
  customerName: z.string().min(2, 'Name is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().min(5, 'Phone number is required'),
  numberOfPeople: z.number().min(1, 'Must request at least 1 seat'),
  notes: z.string().optional().nullable(),
});

/**
 * Helper: Calculate real-time active bookings count for a group tour
 */
const getActiveBookedSlots = async (groupTourId: string): Promise<number> => {
  const aggregate = await prisma.groupTourBooking.aggregate({
    where: {
      groupTourId,
      status: 'CONFIRMED',
    },
    _sum: {
      numberOfPeople: true,
    },
  });
  return aggregate._sum.numberOfPeople || 0;
};

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

/**
 * 1. GET /api/group-tours/calendar
 * Public endpoint: Returns date-indexed group tour availability for calendar display
 */
export const getPublicGroupToursCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;

    const whereClause: any = {
      status: { notIn: ['Cancelled'] },
    };

    if (month && year) {
      const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
      const endOfMonth = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      whereClause.AND = [
        { startDate: { lte: endOfMonth } },
        { endDate: { gte: startOfMonth } },
      ];
    }

    const groupTours = await prisma.groupTour.findMany({
      where: whereClause,
      include: {
        pricing: true,
        package: {
          select: {
            id: true,
            title: true,
            slug: true,
            images: { take: 1, select: { url: true } },
          },
        },
        bookings: {
          where: { status: 'CONFIRMED' },
          select: { numberOfPeople: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    const calendarItems = groupTours.map((gt) => {
      const bookedSlots = gt.bookings.reduce((sum, b) => sum + b.numberOfPeople, 0);
      const availableSlots = Math.max(0, gt.totalSlots - bookedSlots);
      const now = new Date();
      
      const deadlineEnd = new Date(gt.bookingDeadline);
      deadlineEnd.setHours(23, 59, 59, 999);
      const isExpired = deadlineEnd < now || new Date(gt.endDate) < now;

      let calculatedStatus = gt.status;
      if (isExpired && gt.status !== 'Cancelled') {
        calculatedStatus = new Date(gt.endDate) < now ? 'Completed' : 'Full';
      } else if (availableSlots === 0) {
        calculatedStatus = 'Full';
      } else if (availableSlots <= 3) {
        calculatedStatus = 'Almost Full';
      }

      return {
        id: gt.id,
        groupTourRef: gt.groupTourRef,
        packageId: gt.packageId,
        title: gt.title,
        destination: gt.destination,
        startDate: gt.startDate.toISOString(),
        endDate: gt.endDate.toISOString(),
        pricePerPerson: Number(gt.pricePerPerson),
        totalSlots: gt.totalSlots,
        bookedSlots,
        availableSlots,
        bookingDeadline: gt.bookingDeadline.toISOString(),
        status: calculatedStatus,
        imageUrl: gt.imageUrl || gt.package?.images[0]?.url || null,
        description: gt.description,
        isJoinable: availableSlots > 0 && !isExpired && calculatedStatus !== 'Cancelled' && calculatedStatus !== 'Completed',
        pricing: gt.pricing || [],
      };
    });

    res.status(200).json({ data: calendarItems });
  } catch (error: any) {
    console.error('Error fetching group tours calendar:', error);
    res.status(500).json({ error: 'Failed to fetch group tours calendar' });
  }
};

/**
 * 2. GET /api/group-tours/public/:id
 * Public detailed view of a group tour
 */
export const getPublicGroupTourById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const gt = await prisma.groupTour.findUnique({
      where: { id },
      include: {
        pricing: true,
        package: {
          select: {
            id: true,
            title: true,
            slug: true,
            overview: true,
            durationDays: true,
            durationNights: true,
            images: { select: { url: true } },
          },
        },
        bookings: {
          where: { status: 'CONFIRMED' },
          select: { numberOfPeople: true },
        },
      },
    });

    if (!gt) {
      res.status(404).json({ error: 'Group tour not found' });
      return;
    }

    const bookedSlots = gt.bookings.reduce((sum, b) => sum + b.numberOfPeople, 0);
    const availableSlots = Math.max(0, gt.totalSlots - bookedSlots);
    const now = new Date();
    
    const deadlineEnd = new Date(gt.bookingDeadline);
    deadlineEnd.setHours(23, 59, 59, 999);
    const isExpired = deadlineEnd < now || new Date(gt.endDate) < now;

    let calculatedStatus = gt.status;
    if (isExpired && gt.status !== 'Cancelled') {
      calculatedStatus = new Date(gt.endDate) < now ? 'Completed' : 'Full';
    } else if (availableSlots === 0) {
      calculatedStatus = 'Full';
    } else if (availableSlots <= 3) {
      calculatedStatus = 'Almost Full';
    }

    res.status(200).json({
      id: gt.id,
      groupTourRef: gt.groupTourRef,
      packageId: gt.packageId,
      title: gt.title,
      destination: gt.destination,
      startDate: gt.startDate.toISOString(),
      endDate: gt.endDate.toISOString(),
      pricePerPerson: Number(gt.pricePerPerson),
      totalSlots: gt.totalSlots,
      bookedSlots,
      availableSlots,
      bookingDeadline: gt.bookingDeadline.toISOString(),
      status: calculatedStatus,
      imageUrl: gt.imageUrl || gt.package?.images[0]?.url || null,
      description: gt.description || gt.package?.overview || null,
      package: gt.package,
      isJoinable: availableSlots > 0 && !isExpired && calculatedStatus !== 'Cancelled' && calculatedStatus !== 'Completed',
      pricing: gt.pricing || [],
    });
  } catch (error: any) {
    console.error('Error fetching public group tour by ID:', error);
    res.status(500).json({ error: 'Failed to fetch group tour details' });
  }
};

/**
 * 3. POST /api/group-tours/public/:id/join
 * Public endpoint: Join group tour with atomic transaction & overbooking protection
 */
export const joinGroupTour = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validated = joinGroupTourSchema.parse(req.body);

    // Atomic transaction for concurrency-safe booking
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock / Fetch group tour
      const groupTour = await tx.groupTour.findUnique({
        where: { id },
      });

      if (!groupTour) {
        throw new Error('Group tour not found');
      }

      if (groupTour.status === 'Cancelled' || groupTour.status === 'Completed') {
        throw new Error(`This group tour is ${groupTour.status.toLowerCase()} and cannot be joined.`);
      }

      const now = new Date();
      const deadlineEnd = new Date(groupTour.bookingDeadline);
      deadlineEnd.setHours(23, 59, 59, 999);
      if (deadlineEnd < now) {
        throw new Error('Booking deadline for this group tour has passed.');
      }

      // 2. Aggregate current booked seats atomically
      const currentBookedAggregate = await tx.groupTourBooking.aggregate({
        where: {
          groupTourId: id,
          status: 'CONFIRMED',
        },
        _sum: {
          numberOfPeople: true,
        },
      });

      const currentBooked = currentBookedAggregate._sum.numberOfPeople || 0;
      const availableSlots = groupTour.totalSlots - currentBooked;

      if (availableSlots <= 0) {
        throw new Error('This group tour is currently full.');
      }

      if (validated.numberOfPeople > availableSlots) {
        throw new Error(`Only ${availableSlots} slot${availableSlots > 1 ? 's are' : ' is'} currently available.`);
      }

      // 3. Find or Create Customer in CRM
      let customer = await tx.customer.findUnique({
        where: { email: validated.customerEmail.toLowerCase().trim() },
      });

      if (!customer) {
        const nameParts = validated.customerName.trim().split(' ');
        const firstName = nameParts[0] || 'Valued';
        const lastName = nameParts.slice(1).join(' ') || undefined;

        customer = await tx.customer.create({
          data: {
            firstName,
            lastName,
            email: validated.customerEmail.toLowerCase().trim(),
            phone: validated.customerPhone.trim(),
          },
        });
      }

      // 4. Create Enquiry in CRM
      const refCount = await tx.enquiry.count();
      const enquiryRef = `ENQ-${new Date().getFullYear()}-${(refCount + 1).toString().padStart(4, '0')}`;
      
      const enquiry = await tx.enquiry.create({
        data: {
          referenceNumber: enquiryRef,
          source: 'Group Tour Calendar',
          status: 'NEW',
          customerId: customer.id,
          packageId: groupTour.packageId || undefined,
          destination: groupTour.destination,
          travelDate: groupTour.startDate.toISOString().split('T')[0],
          travellerCount: validated.numberOfPeople,
          specialRequests: `Group Tour Join Request (${groupTour.groupTourRef} - ${groupTour.title}). Notes: ${validated.notes || 'None'}`,
        },
      });

      // 5. Create GroupTourBooking
      const booking = await tx.groupTourBooking.create({
        data: {
          groupTourId: id,
          customerId: customer.id,
          enquiryId: enquiry.id,
          customerName: validated.customerName.trim(),
          customerEmail: validated.customerEmail.toLowerCase().trim(),
          customerPhone: validated.customerPhone.trim(),
          numberOfPeople: validated.numberOfPeople,
          notes: validated.notes ? validated.notes.trim() : undefined,
          status: 'CONFIRMED',
        },
      });

      // 6. Calculate new status
      const newBookedCount = currentBooked + validated.numberOfPeople;
      const newAvailable = groupTour.totalSlots - newBookedCount;

      let newStatus = 'Open';
      if (newAvailable <= 0) {
        newStatus = 'Full';
      } else if (newAvailable <= 3) {
        newStatus = 'Almost Full';
      }

      await tx.groupTour.update({
        where: { id },
        data: { status: newStatus },
      });

      return {
        booking,
        enquiry,
        customer,
        newAvailableSlots: Math.max(0, newAvailable),
        newStatus,
      };
    });

    res.status(201).json({
      message: `Successfully joined ${result.booking.numberOfPeople} seat(s) for the group tour!`,
      bookingId: result.booking.id,
      enquiryRef: result.enquiry.referenceNumber,
      availableSlots: result.newAvailableSlots,
      status: result.newStatus,
    });
  } catch (error: any) {
    console.error('Error joining group tour:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid join input' });
      return;
    }
    res.status(400).json({ error: error.message || 'Failed to join group tour' });
  }
};

// ==========================================
// ADMIN ENDPOINTS (Protected with Auth & RBAC)
// ==========================================

/**
 * 4. GET /api/group-tours/admin/list
 */
export const getAdminGroupTours = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.status = status as string;
    }

    if (search) {
      const q = (search as string).trim();
      whereClause.OR = [
        { groupTourRef: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { destination: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, groupTours] = await Promise.all([
      prisma.groupTour.count({ where: whereClause }),
      prisma.groupTour.findMany({
        where: whereClause,
        skip,
        take: limitNum,
        orderBy: { startDate: 'desc' },
        include: {
          package: { select: { id: true, title: true } },
          pricing: true,
          createdBy: { select: { firstName: true, lastName: true } },
          bookings: {
            where: { status: 'CONFIRMED' },
            select: { id: true, customerName: true, customerEmail: true, customerPhone: true, numberOfPeople: true, createdAt: true },
          },
        },
      }),
    ]);

    const formatted = groupTours.map((gt) => {
      const bookedSlots = gt.bookings.reduce((sum, b) => sum + b.numberOfPeople, 0);
      const availableSlots = Math.max(0, gt.totalSlots - bookedSlots);

      return {
        ...gt,
        pricePerPerson: Number(gt.pricePerPerson),
        bookedSlots,
        availableSlots,
      };
    });

    res.status(200).json({
      groupTours: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin group tours:', error);
    res.status(500).json({ error: 'Failed to fetch group tours' });
  }
};

/**
 * 5. POST /api/group-tours/admin/create
 */
export const createGroupTour = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = groupTourSchema.parse(req.body);
    const groupTourRef = await generateGroupTourRef();

    let employeeId: string | undefined = undefined;
    if (req.user?.userId) {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user.userId }
      });
      if (!employee) {
        res.status(400).json({ error: 'Authenticated user is not linked to a valid employee record. Cannot create group tour.' });
        return;
      }
      employeeId = employee.id;
    }

    const groupTour = await prisma.groupTour.create({
      data: {
        groupTourRef,
        packageId: validated.packageId || undefined,
        title: validated.title.trim(),
        destination: validated.destination.trim(),
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        pricePerPerson: validated.pricePerPerson,
        totalSlots: validated.totalSlots,
        bookingDeadline: new Date(validated.bookingDeadline),
        description: sanitizeStr(validated.description),
        imageUrl: sanitizeStr(validated.imageUrl),
        status: validated.status || 'Open',
        createdById: employeeId,
        pricing: validated.pricingVars && validated.pricingVars.length > 0 ? {
          create: validated.pricingVars.map((pv: any) => ({
            title: pv.title,
            price: Number(pv.adultPrice) || 0,
            adultPrice: Number(pv.adultPrice) || 0,
            child6to17Price: Number(pv.child6to17Price) || 0,
            child2to5Price: Number(pv.child2to5Price) || 0,
            infantPrice: Number(pv.infantPrice) || 0,
          }))
        } : undefined
      },
      include: {
        package: { select: { id: true, title: true } },
        pricing: true,
      },
    });

    res.status(201).json({ groupTour, message: 'Group tour created successfully' });
  } catch (error: any) {
    console.error('Error creating group tour:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid group tour input' });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to create group tour' });
  }
};

/**
 * 6. PUT /api/group-tours/admin/:id
 */
export const updateGroupTour = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validated = groupTourSchema.partial().parse(req.body);

    const existing = await prisma.groupTour.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Group tour not found' });
      return;
    }

    const updateData: any = {
      packageId: validated.packageId !== undefined ? (validated.packageId || null) : existing.packageId,
      title: validated.title !== undefined ? validated.title.trim() : existing.title,
      destination: validated.destination !== undefined ? validated.destination.trim() : existing.destination,
      startDate: validated.startDate !== undefined ? new Date(validated.startDate) : existing.startDate,
      endDate: validated.endDate !== undefined ? new Date(validated.endDate) : existing.endDate,
      pricePerPerson: validated.pricePerPerson !== undefined ? validated.pricePerPerson : existing.pricePerPerson,
      totalSlots: validated.totalSlots !== undefined ? validated.totalSlots : existing.totalSlots,
      bookingDeadline: validated.bookingDeadline !== undefined ? new Date(validated.bookingDeadline) : existing.bookingDeadline,
      description: validated.description !== undefined ? sanitizeStr(validated.description) : existing.description,
      imageUrl: validated.imageUrl !== undefined ? sanitizeStr(validated.imageUrl) : existing.imageUrl,
      status: validated.status !== undefined ? validated.status : existing.status,
    };

    if (validated.pricingVars && Array.isArray(validated.pricingVars)) {
      updateData.pricing = {
        deleteMany: {},
        create: validated.pricingVars.map((pv: any) => ({
          title: pv.title,
          price: Number(pv.adultPrice) || 0,
          adultPrice: Number(pv.adultPrice) || 0,
          child6to17Price: Number(pv.child6to17Price) || 0,
          child2to5Price: Number(pv.child2to5Price) || 0,
          infantPrice: Number(pv.infantPrice) || 0,
        }))
      };
    }

    const updated = await prisma.groupTour.update({
      where: { id },
      data: updateData,
      include: { pricing: true },
    });

    res.status(200).json({ groupTour: updated, message: 'Group tour updated successfully' });
  } catch (error: any) {
    console.error('Error updating group tour:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Invalid group tour input' });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to update group tour' });
  }
};

/**
 * 7. DELETE /api/group-tours/admin/:id
 */
export const deleteGroupTour = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.groupTour.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Group tour not found' });
      return;
    }

    await prisma.groupTour.delete({ where: { id } });
    res.status(200).json({ message: 'Group tour deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting group tour:', error);
    res.status(500).json({ error: error.message || 'Failed to delete group tour' });
  }
};
