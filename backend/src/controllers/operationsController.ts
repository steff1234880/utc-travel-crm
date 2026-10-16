import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const DEFAULT_CHECKLIST_ITEMS = [
  { task: 'Customer confirmation', category: 'CUSTOMER', orderIndex: 1 },
  { task: 'Payment verification', category: 'FINANCE', orderIndex: 2 },
  { task: 'Passport/document verification', category: 'DOCUMENTS', orderIndex: 3 },
  { task: 'Flight ticket confirmation', category: 'TICKETING', orderIndex: 4 },
  { task: 'Train/bus ticket confirmation', category: 'TICKETING', orderIndex: 5 },
  { task: 'Hotel confirmation', category: 'ACCOMMODATION', orderIndex: 6 },
  { task: 'Transportation confirmation', category: 'LOGISTICS', orderIndex: 7 },
  { task: 'Activity confirmation', category: 'ITINERARY', orderIndex: 8 },
  { task: 'Travel insurance if applicable', category: 'DOCUMENTS', orderIndex: 9 },
  { task: 'Customer communication', category: 'CUSTOMER', orderIndex: 10 },
  { task: 'Pre-trip briefing', category: 'CUSTOMER', orderIndex: 11 },
  { task: 'Emergency contact verification', category: 'SAFETY', orderIndex: 12 },
  { task: 'Final document delivery', category: 'DOCUMENTS', orderIndex: 13 },
  { task: 'Post-trip completion', category: 'CLOSURE', orderIndex: 14 },
];

// Helper to resolve employeeId from token req.user.id
async function getEmployeeIdFromUserId(userId?: string): Promise<string | null> {
  if (!userId) return null;
  const emp = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  return emp ? emp.id : null;
}

// ----------------------------------------------------
// 1. OPERATIONS DASHBOARD
// ----------------------------------------------------
export const getOperationsDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, dateFrom, dateTo, destination, coordinatorId, status, page = '1', limit = '10', sortBy = 'startDate', sortOrder = 'asc' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Counts
    const [
      upcomingToursCount,
      ongoingToursCount,
      completedToursCount,
      cancelledToursCount,
      todayDeparturesCount,
      upcomingDeparturesCount,
      pendingTasksCount,
      pendingFlightTicketsCount,
      pendingTrainTicketsCount,
      pendingBusTicketsCount,
      pendingHotelsCount,
    ] = await Promise.all([
      prisma.tour.count({ where: { status: { in: ['Upcoming', 'Preparation', 'Confirmed'] } } }),
      prisma.tour.count({ where: { status: 'Ongoing' } }),
      prisma.tour.count({ where: { status: 'Completed' } }),
      prisma.tour.count({ where: { status: 'Cancelled' } }),
      prisma.tour.count({
        where: {
          startDate: {
            gte: startOfToday,
            lte: endOfToday,
          },
          status: { notIn: ['Cancelled'] },
        },
      }),
      prisma.tour.count({
        where: {
          startDate: {
            gt: endOfToday,
            lte: thirtyDaysFromNow,
          },
          status: { notIn: ['Cancelled', 'Completed'] },
        },
      }),
      prisma.operationalTask.count({ where: { status: { in: ['Pending', 'In Progress'] } } }),
      prisma.flightTicket.count({ where: { ticketStatus: { in: ['Requested', 'Processing'] } } }),
      prisma.trainTicket.count({ where: { ticketStatus: { in: ['Requested', 'Processing'] } } }),
      prisma.busTicket.count({ where: { ticketStatus: { in: ['Requested', 'Processing'] } } }),
      prisma.hotelReservation.count({ where: { reservationStatus: { in: ['Requested', 'Pending'] } } }),
    ]);

    const pendingTicketsCount = pendingFlightTicketsCount + pendingTrainTicketsCount + pendingBusTicketsCount;

    // Build filter for active/upcoming table
    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.status = status as string;
    }

    if (destination) {
      whereClause.destination = { contains: destination as string, mode: 'insensitive' };
    }

    if (coordinatorId) {
      whereClause.coordinatorId = coordinatorId as string;
    }

    if (dateFrom || dateTo) {
      whereClause.startDate = {};
      if (dateFrom) whereClause.startDate.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.startDate.lte = new Date(dateTo as string);
    }

    if (search) {
      const q = search as string;
      whereClause.OR = [
        { tourReference: { contains: q, mode: 'insensitive' } },
        { destination: { contains: q, mode: 'insensitive' } },
        { customer: { firstName: { contains: q, mode: 'insensitive' } } },
        { customer: { lastName: { contains: q, mode: 'insensitive' } } },
        { customer: { email: { contains: q, mode: 'insensitive' } } },
        { bookingPrep: { bookingRef: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const validSortFields = ['startDate', 'endDate', 'tourReference', 'destination', 'createdAt', 'status'];
    const actualSortBy = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'startDate';
    const actualSortOrder = (sortOrder as string).toLowerCase() === 'desc' ? 'desc' : 'asc';

    const [tours, totalTours] = await Promise.all([
      prisma.tour.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          package: {
            select: { id: true, title: true, slug: true },
          },
          bookingPrep: {
            select: { id: true, bookingRef: true },
          },
          coordinator: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: {
              travellers: true,
              checklistTasks: true,
              flightTickets: true,
              trainTickets: true,
              busTickets: true,
              hotelReservations: true,
            },
          },
        },
        orderBy: { [actualSortBy]: actualSortOrder },
        skip,
        take: limitNum,
      }),
      prisma.tour.count({ where: whereClause }),
    ]);

    // Part 2 Counts
    const [
      pendingTransportReservationsCount,
      pendingVendorsCount,
      pendingDocumentVerificationsCount,
      expiringDocumentsCount,
      expiredDocumentsCount,
      costAggregations,
    ] = await Promise.all([
      prisma.transportReservation.count({ where: { reservationStatus: { in: ['Requested', 'Pending'] } } }),
      prisma.vendor.count({ where: { isActive: true } }),
      prisma.operationsDocument.count({ where: { verificationStatus: 'Pending' } }),
      prisma.operationsDocument.count({
        where: {
          expiryDate: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.operationsDocument.count({
        where: {
          expiryDate: { lt: now },
        },
      }),
      prisma.operationalCost.aggregate({
        _sum: { estimatedCost: true, actualCost: true },
      }),
    ]);

    res.status(200).json({
      summary: {
        upcomingTours: upcomingToursCount,
        ongoingTours: ongoingToursCount,
        completedTours: completedToursCount,
        cancelledTours: cancelledToursCount,
        todayDepartures: todayDeparturesCount,
        upcomingDepartures: upcomingDeparturesCount,
        pendingTasks: pendingTasksCount,
        pendingTickets: pendingTicketsCount,
        pendingHotels: pendingHotelsCount,
        pendingTransportReservations: pendingTransportReservationsCount,
        activeVendors: pendingVendorsCount,
        pendingDocumentVerifications: pendingDocumentVerificationsCount,
        expiringDocuments: expiringDocumentsCount,
        expiredDocuments: expiredDocumentsCount,
        totalEstimatedCost: costAggregations._sum.estimatedCost ? Number(costAggregations._sum.estimatedCost) : 0,
        totalActualCost: costAggregations._sum.actualCost ? Number(costAggregations._sum.actualCost) : 0,
      },
      tours,
      pagination: {
        total: totalTours,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalTours / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching operations dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch operations dashboard statistics' });
  }
};

// ----------------------------------------------------
// 2. TOUR MANAGEMENT (List, Create, Update Status)
// ----------------------------------------------------
export const getTours = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, coordinatorId, destination, dateFrom, dateTo, page = '1', limit = '10', sortBy = 'startDate', sortOrder = 'asc' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.status = status as string;
    }

    if (destination) {
      whereClause.destination = { contains: destination as string, mode: 'insensitive' };
    }

    if (coordinatorId) {
      whereClause.coordinatorId = coordinatorId as string;
    }

    if (dateFrom || dateTo) {
      whereClause.startDate = {};
      if (dateFrom) whereClause.startDate.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.startDate.lte = new Date(dateTo as string);
    }

    if (search) {
      const q = search as string;
      whereClause.OR = [
        { tourReference: { contains: q, mode: 'insensitive' } },
        { destination: { contains: q, mode: 'insensitive' } },
        { customer: { firstName: { contains: q, mode: 'insensitive' } } },
        { customer: { lastName: { contains: q, mode: 'insensitive' } } },
        { customer: { email: { contains: q, mode: 'insensitive' } } },
        { bookingPrep: { bookingRef: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const validSortFields = ['startDate', 'endDate', 'tourReference', 'destination', 'createdAt', 'status'];
    const actualSortBy = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'startDate';
    const actualSortOrder = (sortOrder as string).toLowerCase() === 'desc' ? 'desc' : 'asc';

    const [tours, total] = await Promise.all([
      prisma.tour.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          package: {
            select: { id: true, title: true, slug: true },
          },
          bookingPrep: {
            select: { id: true, bookingRef: true, quotationId: true },
          },
          coordinator: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: {
              travellers: true,
              checklistTasks: true,
              flightTickets: true,
              trainTickets: true,
              busTickets: true,
              hotelReservations: true,
            },
          },
        },
        orderBy: { [actualSortBy]: actualSortOrder },
        skip,
        take: limitNum,
      }),
      prisma.tour.count({ where: whereClause }),
    ]);

    res.status(200).json({
      tours,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching tours:', error);
    res.status(500).json({ error: 'Failed to fetch tours list' });
  }
};

const createTourSchema = z.object({
  tourReference: z.string().optional().nullable(),
  bookingPrepId: z.string().optional().nullable(),
  quotationId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  packageId: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  travellerCount: z.coerce.number().int().min(1, 'Number of travellers must be at least 1').default(1),
  coordinatorId: z.string().optional().nullable(),
  operationalNotes: z.string().optional().nullable(),
  status: z.enum(['Upcoming', 'Preparation', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled', 'Postponed']).default('Upcoming'),
  travellers: z.array(z.object({
    name: z.string().min(1, 'Traveller name required'),
    age: z.coerce.number().int().optional().nullable(),
    gender: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    passportNumber: z.string().optional().nullable(),
    idProofType: z.string().optional().nullable(),
    idProofNumber: z.string().optional().nullable(),
    specialRequests: z.string().optional().nullable(),
  })).optional().default([]),
});

export const createTour = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = createTourSchema.parse(req.body);

    // Clean optional string fields
    const bookingPrepId = validated.bookingPrepId?.trim() || null;
    let quotationId = validated.quotationId?.trim() || null;
    let customerId = validated.customerId?.trim() || null;
    let packageId = validated.packageId?.trim() || null;
    let destination = validated.destination?.trim() || null;
    const coordinatorId = validated.coordinatorId?.trim() || null;
    const operationalNotes = validated.operationalNotes?.trim() || null;

    // Handle Booking relation if provided
    if (bookingPrepId) {
      const existingTour = await prisma.tour.findFirst({ where: { bookingPrepId } });
      if (existingTour) {
        res.status(400).json({ error: 'An Operations record (Tour) already exists for this booking', tourId: existingTour.id });
        return;
      }

      const bookingPrep = await prisma.bookingPreparation.findUnique({
        where: { id: bookingPrepId },
        include: { quotation: true },
      });
      if (!bookingPrep) {
        res.status(404).json({ error: 'Selected Booking not found' });
        return;
      }
      // Reuse customerId & quotationId from booking
      customerId = bookingPrep.customerId;
      quotationId = bookingPrep.quotationId;

      if (!packageId && bookingPrep.quotation?.packageId) {
        packageId = bookingPrep.quotation.packageId;
      }
      if (!destination && bookingPrep.quotation?.destination) {
        destination = bookingPrep.quotation.destination;
      }
    }

    // Verify customer is specified and exists
    if (!customerId) {
      res.status(400).json({ error: 'Customer is required' });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(404).json({ error: 'Selected Customer not found' });
      return;
    }

    // Verify destination is specified
    if (!destination) {
      res.status(400).json({ error: 'Destination is required' });
      return;
    }

    // Verify package exists if provided
    if (packageId) {
      const pkg = await prisma.travelPackage.findUnique({ where: { id: packageId } });
      if (!pkg) {
        res.status(404).json({ error: 'Selected Travel Package not found' });
        return;
      }
    }

    // Verify coordinator exists if provided
    if (coordinatorId) {
      const emp = await prisma.employee.findUnique({ where: { id: coordinatorId } });
      if (!emp) {
        res.status(404).json({ error: 'Assigned Coordinator (Employee) not found' });
        return;
      }
    }

    // Validate dates
    const startDateObj = new Date(validated.startDate);
    const endDateObj = new Date(validated.endDate);

    if (isNaN(startDateObj.getTime())) {
      res.status(400).json({ error: 'Invalid Travel Start Date format' });
      return;
    }
    if (isNaN(endDateObj.getTime())) {
      res.status(400).json({ error: 'Invalid Travel End Date format' });
      return;
    }
    if (startDateObj > endDateObj) {
      res.status(400).json({ error: 'Travel Start Date cannot be after Travel End Date' });
      return;
    }

    // Unique tour reference validation / auto-generation
    let tourRef = validated.tourReference?.trim();
    if (!tourRef) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const count = await prisma.tour.count();
      tourRef = `TOUR-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
    } else {
      const existing = await prisma.tour.findUnique({ where: { tourReference: tourRef } });
      if (existing) {
        res.status(400).json({ error: 'Tour Reference Number already exists' });
        return;
      }
    }

    // Create tour record with default checklist and travellers
    const tour = await prisma.tour.create({
      data: {
        tourReference: tourRef,
        bookingPrepId,
        quotationId,
        customerId,
        packageId,
        destination,
        startDate: startDateObj,
        endDate: endDateObj,
        travellerCount: Math.max(1, validated.travellerCount),
        coordinatorId,
        operationalNotes,
        status: validated.status,
        travellers: {
          create: validated.travellers.map((t) => ({
            name: t.name,
            age: t.age || null,
            gender: t.gender || null,
            phone: t.phone || null,
            email: t.email || null,
            passportNumber: t.passportNumber || null,
            idProofType: t.idProofType || null,
            idProofNumber: t.idProofNumber || null,
            specialRequests: t.specialRequests || null,
          })),
        },
        checklistTasks: {
          create: DEFAULT_CHECKLIST_ITEMS.map((item) => ({
            task: item.task,
            category: item.category,
            orderIndex: item.orderIndex,
            status: 'Pending',
          })),
        },
      },
      include: {
        customer: true,
        package: true,
        coordinator: true,
        travellers: true,
        checklistTasks: { orderBy: { orderIndex: 'asc' } },
      },
    });

    // Record coordinator assignment history if coordinator is assigned
    if (coordinatorId) {
      let currentEmployeeId = await getEmployeeIdFromUserId(req.user?.userId);
      if (!currentEmployeeId) {
        currentEmployeeId = coordinatorId;
      }
      await prisma.tourCoordinatorAssignment.create({
        data: {
          tourId: tour.id,
          employeeId: coordinatorId,
          assignedById: currentEmployeeId,
          notes: 'Initial assignment on tour creation',
          status: 'ACTIVE',
        },
      });
    }

    res.status(201).json({ tour, message: 'Tour created successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const issueMsg = firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Validation error';
      res.status(400).json({ error: issueMsg });
      return;
    }
    console.error('Error creating tour:', error);
    res.status(500).json({ error: error.message || 'Failed to create tour' });
  }
};


// ----------------------------------------------------
// 3. TOUR DETAILS & UPDATE
// ----------------------------------------------------
export const getTourById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const tour = await prisma.tour.findUnique({
      where: { id },
      include: {
        customer: true,
        package: true,
        bookingPrep: {
          include: {
            quotation: true,
            payments: {
              include: { transaction: true }
            }
          },
        },
        quotation: true,
        coordinator: {
          include: {
            department: { select: { name: true } },
            designation: { select: { name: true } },
            user: { select: { email: true } },
          },
        },
        travellers: {
          orderBy: { createdAt: 'asc' },
        },
        coordinatorAssignments: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeId: true,
                department: { select: { name: true } },
                designation: { select: { name: true } },
              },
            },
            assignedBy: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
        checklistTasks: {
          include: {
            assignedEmployee: { select: { id: true, firstName: true, lastName: true } },
            completedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { orderIndex: 'asc' },
        },
        flightTickets: {
          include: { tourTraveller: true },
          orderBy: { departureDateTime: 'asc' },
        },
        trainTickets: {
          include: { tourTraveller: true },
          orderBy: { departureDateTime: 'asc' },
        },
        busTickets: {
          include: { tourTraveller: true },
          orderBy: { departureDateTime: 'asc' },
        },
        hotelReservations: {
          include: { customer: true },
          orderBy: { checkInDate: 'asc' },
        },
      },
    });

    if (!tour) {
      res.status(404).json({ error: 'Tour not found' });
      return;
    }

    let enrichedBookingPrep: any = (tour as any).bookingPrep;
    if (enrichedBookingPrep) {
      const totalAmount = enrichedBookingPrep.taxableAmount + enrichedBookingPrep.totalTaxAmount;
      const totalReceived = enrichedBookingPrep.payments.reduce((sum: any, p: any) => p.transaction.status === 'COMPLETED' ? sum + p.transaction.amount : sum, 0);
      const balanceAmount = totalAmount - totalReceived;
      
      let paymentStatus = 'PENDING';
      if (totalReceived > 0 && totalReceived < totalAmount) paymentStatus = 'PARTIALLY_PAID';
      if (totalReceived >= totalAmount && totalAmount > 0) paymentStatus = 'PAID';

      enrichedBookingPrep = { ...enrichedBookingPrep, totalAmount, totalReceived, balanceAmount, paymentStatus };
    }

    res.status(200).json({ ...tour, bookingPrep: enrichedBookingPrep } as any);
  } catch (error: any) {
    console.error('Error fetching tour by ID:', error);
    res.status(500).json({ error: 'Failed to fetch tour details' });
  }
};

export const updateTour = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const {
      tourReference,
      destination,
      startDate,
      endDate,
      travellerCount,
      operationalNotes,
      status,
      packageId: rawPackageId,
      coordinatorId: rawCoordinatorId,
      customerId: rawCustomerId,
      bookingPrepId: rawBookingPrepId,
      bookingId: rawBookingId,
      travellers,
    } = req.body;

    const tour = await prisma.tour.findUnique({ where: { id } });
    if (!tour) {
      res.status(404).json({ error: 'Tour not found' });
      return;
    }

    // Sanitize optional foreign keys & text fields converting "" to null
    const sanitizeNullableString = (val: any, fallback: string | null): string | null => {
      if (val === undefined) return fallback;
      if (val === null) return null;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : null;
      }
      return fallback;
    };

    const rawPrep = rawBookingPrepId !== undefined ? rawBookingPrepId : rawBookingId;
    const bookingPrepId = sanitizeNullableString(rawPrep, tour.bookingPrepId);
    let packageId = sanitizeNullableString(rawPackageId, tour.packageId);
    const coordinatorId = sanitizeNullableString(rawCoordinatorId, tour.coordinatorId);
    const operationalNotesVal = sanitizeNullableString(operationalNotes, tour.operationalNotes);

    let customerId = (typeof rawCustomerId === 'string' && rawCustomerId.trim() !== '') ? rawCustomerId.trim() : tour.customerId;
    let destinationVal = (typeof destination === 'string' && destination.trim() !== '') ? destination.trim() : tour.destination;
    let quotationId = tour.quotationId;

    // Validate dates if provided
    const newStartDate = startDate ? new Date(startDate) : tour.startDate;
    const newEndDate = endDate ? new Date(endDate) : tour.endDate;

    if (isNaN(newStartDate.getTime())) {
      res.status(400).json({ error: 'Invalid Travel Start Date format' });
      return;
    }
    if (isNaN(newEndDate.getTime())) {
      res.status(400).json({ error: 'Invalid Travel End Date format' });
      return;
    }
    if (newStartDate > newEndDate) {
      res.status(400).json({ error: 'Travel Start Date cannot be after Travel End Date' });
      return;
    }

    // Check unique tourReference if changed
    let finalTourRef = tour.tourReference;
    if (tourReference && tourReference.trim() !== tour.tourReference) {
      const trimmedRef = tourReference.trim();
      const existingRef = await prisma.tour.findUnique({ where: { tourReference: trimmedRef } });
      if (existingRef && existingRef.id !== id) {
        res.status(400).json({ error: 'Tour Reference Number already exists' });
        return;
      }
      finalTourRef = trimmedRef;
    }

    // Handle booking prep update if changed
    if (bookingPrepId && bookingPrepId !== tour.bookingPrepId) {
      const bookingPrep = await prisma.bookingPreparation.findUnique({
        where: { id: bookingPrepId },
        include: { quotation: true },
      });
      if (!bookingPrep) {
        res.status(404).json({ error: 'Selected Booking not found' });
        return;
      }
      customerId = bookingPrep.customerId;
      quotationId = bookingPrep.quotationId;
      if (!packageId && bookingPrep.quotation?.packageId) {
        packageId = bookingPrep.quotation.packageId;
      }
      if (destinationVal === tour.destination && bookingPrep.quotation?.destination) {
        destinationVal = bookingPrep.quotation.destination;
      }
    }

    // Verify customer exists
    if (customerId) {
      const cust = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!cust) {
        res.status(404).json({ error: 'Selected Customer not found' });
        return;
      }
    }

    // Verify package exists if provided
    if (packageId) {
      const pkg = await prisma.travelPackage.findUnique({ where: { id: packageId } });
      if (!pkg) {
        res.status(404).json({ error: 'Selected Travel Package not found' });
        return;
      }
    }

    // Verify coordinator exists if provided
    if (coordinatorId) {
      const emp = await prisma.employee.findUnique({ where: { id: coordinatorId } });
      if (!emp) {
        res.status(404).json({ error: 'Assigned Coordinator (Employee) not found' });
        return;
      }
    }

    // Update main tour record
    const updated = await prisma.tour.update({
      where: { id },
      data: {
        tourReference: finalTourRef,
        bookingPrepId,
        quotationId,
        customerId,
        packageId,
        destination: destinationVal,
        startDate: newStartDate,
        endDate: newEndDate,
        travellerCount: (travellerCount !== undefined && travellerCount !== null) ? Math.max(1, parseInt(travellerCount, 10)) : tour.travellerCount,
        operationalNotes: operationalNotesVal,
        status: status !== undefined ? status : tour.status,
        coordinatorId,
      },
      include: {
        customer: true,
        package: true,
        coordinator: true,
        bookingPrep: {
          include: { quotation: true }
        },
        travellers: true,
      },
    });

    // Update travellers if provided
    if (Array.isArray(travellers)) {
      await prisma.tourTraveller.deleteMany({ where: { tourId: id } });
      if (travellers.length > 0) {
        await prisma.tourTraveller.createMany({
          data: travellers.map((t: any) => ({
            tourId: id,
            name: t.name,
            age: (t.age && !isNaN(parseInt(t.age, 10))) ? parseInt(t.age, 10) : null,
            gender: t.gender || null,
            phone: t.phone || null,
            email: t.email || null,
            passportNumber: t.passportNumber || null,
            idProofType: t.idProofType || null,
            idProofNumber: t.idProofNumber || null,
            specialRequests: t.specialRequests || null,
          })),
        });
      }
    }

    // Record coordinator assignment history if changed
    if (coordinatorId && coordinatorId !== tour.coordinatorId) {
      let currentEmployeeId = await getEmployeeIdFromUserId(req.user?.userId) || coordinatorId;
      await prisma.tourCoordinatorAssignment.updateMany({
        where: { tourId: id, status: 'ACTIVE' },
        data: { status: 'REASSIGNED', unassignedAt: new Date() },
      });
      await prisma.tourCoordinatorAssignment.create({
        data: {
          tourId: id,
          employeeId: coordinatorId,
          assignedById: currentEmployeeId,
          notes: 'Reassigned during tour update',
          status: 'ACTIVE',
        },
      });
    }

    // Add audit log if status changed to Completed or Cancelled
    if (status && status !== tour.status && (status === 'Completed' || status === 'Cancelled' || status === 'CANCELLED')) {
      if (req.user?.userId) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.userId,
            userEmail: req.user.email || 'unknown',
            action: status === 'Completed' ? 'COMPLETE_TOUR' : 'CANCEL_TOUR',
            module: 'OPERATIONS',
            recordId: updated.id,
            details: `Tour ${updated.tourReference} marked as ${status}`,
          }
        });
      }
    }

    res.status(200).json({ tour: updated, message: 'Tour updated successfully' });
  } catch (error: any) {
    console.error('Error updating tour:', error);
    res.status(400).json({ error: error.message || 'Failed to update tour' });
  }
};

export const deleteTour = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const tour = await prisma.tour.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            hotelReservations: true,
            flightTickets: true,
            trainTickets: true,
            busTickets: true,
          },
        },
        bookingPrep: {
          select: { id: true, bookingRef: true },
        },
        quotation: {
          select: { id: true, quotationNumber: true },
        },
      },
    });

    if (!tour) {
      res.status(404).json({ error: 'Tour record not found' });
      return;
    }

    // Safety check: Prevent deletion if tour has active business references
    const inUseReasons: string[] = [];

    if (tour.bookingPrep) {
      inUseReasons.push(`Linked Confirmed Booking (${tour.bookingPrep.bookingRef})`);
    }
    if (tour.quotation) {
      inUseReasons.push(`Linked Quotation (${tour.quotation.quotationNumber})`);
    }
    if (tour._count.hotelReservations > 0) {
      inUseReasons.push(`${tour._count.hotelReservations} Hotel Reservation(s)`);
    }
    if (tour._count.flightTickets > 0) {
      inUseReasons.push(`${tour._count.flightTickets} Flight Ticket(s)`);
    }
    if (tour._count.trainTickets > 0) {
      inUseReasons.push(`${tour._count.trainTickets} Train Ticket(s)`);
    }
    if (tour._count.busTickets > 0) {
      inUseReasons.push(`${tour._count.busTickets} Bus Ticket(s)`);
    }

    if (inUseReasons.length > 0) {
      res.status(400).json({
        error: `Cannot delete Tour "${tour.tourReference}". It is currently in use by: ${inUseReasons.join(', ')}. Please remove or unlink these related records first.`,
      });
      return;
    }

    // Safely delete tour record
    await prisma.tour.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Tour deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting tour:', error);
    res.status(500).json({ error: error.message || 'Failed to delete tour record' });
  }
};




// ----------------------------------------------------
// 4. TOUR COORDINATOR ASSIGNMENT
// ----------------------------------------------------
export const getCoordinatorsList = async (req: Request, res: Response): Promise<void> => {
  try {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        user: { select: { email: true } },
        toursCoordinated: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    const formatted = employees.map((emp) => {
      const tours = emp.toursCoordinated || [];
      const activeTours = tours.filter((t) => ['Upcoming', 'Preparation', 'Confirmed', 'Ongoing'].includes(t.status)).length;
      const upcomingTours = tours.filter((t) => ['Upcoming', 'Preparation', 'Confirmed'].includes(t.status)).length;
      const ongoingTours = tours.filter((t) => t.status === 'Ongoing').length;
      const completedTours = tours.filter((t) => t.status === 'Completed').length;

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        department: emp.department,
        designation: emp.designation,
        email: emp.user?.email || null,
        emergencyContact: emp.emergencyContact || null,
        activeTours,
        upcomingTours,
        ongoingTours,
        completedTours,
        _count: {
          toursCoordinated: activeTours,
        },
      };
    });

    res.status(200).json(formatted);
  } catch (error: any) {
    console.error('Error fetching coordinators list:', error);
    res.status(500).json({ error: 'Failed to fetch coordinators' });
  }
};

export const assignTourCoordinator = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { coordinatorId, notes } = req.body;

    if (!coordinatorId) {
      res.status(400).json({ error: 'Coordinator Employee ID is required' });
      return;
    }

    const tour = await prisma.tour.findUnique({ where: { id } });
    if (!tour) {
      res.status(404).json({ error: 'Tour not found' });
      return;
    }

    const employee = await prisma.employee.findUnique({ where: { id: coordinatorId } });
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const currentEmployeeId = await getEmployeeIdFromUserId(req.user?.userId) || coordinatorId;

    // Mark previous active assignment as REASSIGNED
    await prisma.tourCoordinatorAssignment.updateMany({
      where: { tourId: id, status: 'ACTIVE' },
      data: { status: 'REASSIGNED', unassignedAt: new Date() },
    });

    // Create new assignment history record
    await prisma.tourCoordinatorAssignment.create({
      data: {
        tourId: id,
        employeeId: coordinatorId,
        assignedById: currentEmployeeId,
        notes: notes || 'Assigned via Operations Console',
        status: 'ACTIVE',
      },
    });

    // Update Tour record
    const updatedTour = await prisma.tour.update({
      where: { id },
      data: { coordinatorId },
      include: {
        coordinator: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
    });

    res.status(200).json({ tour: updatedTour, message: 'Coordinator assigned successfully' });
  } catch (error: any) {
    console.error('Error assigning coordinator:', error);
    res.status(500).json({ error: 'Failed to assign coordinator' });
  }
};

export const removeTourCoordinator = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const tour = await prisma.tour.findUnique({ where: { id } });
    if (!tour) {
      res.status(404).json({ error: 'Tour not found' });
      return;
    }

    // Mark active assignment as UNASSIGNED
    await prisma.tourCoordinatorAssignment.updateMany({
      where: { tourId: id, status: 'ACTIVE' },
      data: { status: 'UNASSIGNED', unassignedAt: new Date() },
    });

    const updatedTour = await prisma.tour.update({
      where: { id },
      data: { coordinatorId: null },
    });

    res.status(200).json({ tour: updatedTour, message: 'Coordinator removed from tour' });
  } catch (error: any) {
    console.error('Error removing coordinator:', error);
    res.status(500).json({ error: 'Failed to remove coordinator' });
  }
};

// ----------------------------------------------------
// 5. OPERATIONAL CHECKLIST & TASKS
// ----------------------------------------------------
export const getTourChecklist = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const tasks = await prisma.operationalTask.findMany({
      where: { tourId: id },
      include: {
        assignedEmployee: { select: { id: true, firstName: true, lastName: true } },
        completedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { orderIndex: 'asc' },
    });

    res.status(200).json(tasks);
  } catch (error: any) {
    console.error('Error fetching tour checklist:', error);
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
};

export const updateChecklistTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const taskId = req.params.taskId as string;
    const { status, assignedEmployeeId, dueDate, notes, task, category } = req.body;

    const existingTask = await prisma.operationalTask.findUnique({ where: { id: taskId } });
    if (!existingTask) {
      res.status(404).json({ error: 'Checklist task not found' });
      return;
    }

    const currentEmployeeId = await getEmployeeIdFromUserId(req.user?.userId);

    const updateData: any = {};
    if (task !== undefined) updateData.task = task;
    if (category !== undefined) updateData.category = category;
    if (assignedEmployeeId !== undefined) updateData.assignedEmployeeId = assignedEmployeeId || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (notes !== undefined) updateData.notes = notes;

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'Completed') {
        updateData.completedById = currentEmployeeId || existingTask.assignedEmployeeId || null;
        updateData.completedAt = new Date();
      } else if (status === 'Pending' || status === 'In Progress') {
        updateData.completedById = null;
        updateData.completedAt = null;
      }
    }

    const updatedTask = await prisma.operationalTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignedEmployee: { select: { id: true, firstName: true, lastName: true } },
        completedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(200).json({ task: updatedTask, message: 'Checklist task updated' });
  } catch (error: any) {
    console.error('Error updating checklist task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

export const addChecklistTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string; // tourId
    const { task, category = 'CUSTOM', assignedEmployeeId, dueDate, notes } = req.body;

    if (!task) {
      res.status(400).json({ error: 'Task title is required' });
      return;
    }

    const maxTask = await prisma.operationalTask.findFirst({
      where: { tourId: id },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const nextOrder = (maxTask?.orderIndex || 0) + 1;

    const newTask = await prisma.operationalTask.create({
      data: {
        tourId: id,
        task,
        category,
        assignedEmployeeId: assignedEmployeeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        orderIndex: nextOrder,
        status: 'Pending',
      },
      include: {
        assignedEmployee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ task: newTask, message: 'Custom checklist task added' });
  } catch (error: any) {
    console.error('Error adding checklist task:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
};

// ----------------------------------------------------
// 6. FLIGHT TICKET MANAGEMENT
// ----------------------------------------------------
// 6. FLIGHT TICKET MANAGEMENT
// ----------------------------------------------------
export const getFlightTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, tourId, page = '1', limit = '10', sortBy = 'departureDateTime', sortOrder = 'asc' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.ticketStatus = status as string;
    }

    if (tourId) {
      whereClause.tourId = tourId as string;
    }

    if (search) {
      const q = search as string;
      whereClause.OR = [
        { passengerName: { contains: q, mode: 'insensitive' } },
        { pnr: { contains: q, mode: 'insensitive' } },
        { airline: { contains: q, mode: 'insensitive' } },
        { flightNumber: { contains: q, mode: 'insensitive' } },
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { departureAirport: { contains: q, mode: 'insensitive' } },
        { arrivalAirport: { contains: q, mode: 'insensitive' } },
        { tour: { tourReference: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const validSortFields = ['departureDateTime', 'arrivalDateTime', 'airline', 'createdAt', 'ticketStatus'];
    const actualSortBy = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'departureDateTime';
    const actualSortOrder = (sortOrder as string).toLowerCase() === 'desc' ? 'desc' : 'asc';

    const [tickets, total] = await Promise.all([
      prisma.flightTicket.findMany({
        where: whereClause,
        include: {
          tour: {
            select: {
              id: true,
              tourReference: true,
              destination: true,
              startDate: true,
              endDate: true,
              customer: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          },
          tourTraveller: true,
        },
        orderBy: { [actualSortBy]: actualSortOrder },
        skip,
        take: limitNum,
      }),
      prisma.flightTicket.count({ where: whereClause }),
    ]);

    res.status(200).json({
      tickets,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching flight tickets:', error);
    res.status(500).json({ error: 'Failed to fetch flight tickets' });
  }
};

const flightTicketSchema = z.object({
  tourId: z.string().min(1, 'Tour ID is required'),
  passengerName: z.string().min(1, 'Passenger Name is required'),
  tourTravellerId: z.string().optional().nullable(),
  bookingReference: z.string().optional().nullable(),
  airline: z.string().min(1, 'Airline is required'),
  flightNumber: z.string().min(1, 'Flight Number is required'),
  departureAirport: z.string().min(1, 'Departure Airport is required'),
  arrivalAirport: z.string().min(1, 'Arrival Airport is required'),
  departureDateTime: z.string().min(1, 'Departure Date & Time is required'),
  arrivalDateTime: z.string().min(1, 'Arrival Date & Time is required'),
  pnr: z.string().min(1, 'PNR is required'),
  ticketNumber: z.string().optional().nullable(),
  ticketStatus: z.enum(['Requested', 'Processing', 'Confirmed', 'Issued', 'Cancelled', 'Rescheduled']).default('Requested'),
  internalNotes: z.string().optional().nullable(),
});

export const createFlightTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = flightTicketSchema.parse(req.body);

    const ticket = await prisma.flightTicket.create({
      data: {
        tourId: validated.tourId,
        passengerName: validated.passengerName,
        tourTravellerId: validated.tourTravellerId || null,
        bookingReference: validated.bookingReference || null,
        airline: validated.airline,
        flightNumber: validated.flightNumber,
        departureAirport: validated.departureAirport,
        arrivalAirport: validated.arrivalAirport,
        departureDateTime: new Date(validated.departureDateTime),
        arrivalDateTime: new Date(validated.arrivalDateTime),
        pnr: validated.pnr,
        ticketNumber: validated.ticketNumber || null,
        ticketStatus: validated.ticketStatus,
        internalNotes: validated.internalNotes || null,
      },
      include: { tourTraveller: true },
    });

    res.status(201).json({ ticket, message: 'Flight ticket created successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Validation error' });
      return;
    }
    console.error('Error creating flight ticket:', error);
    res.status(500).json({ error: 'Failed to create flight ticket' });
  }
};

export const updateFlightTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;
    const body = req.body;

    const existing = await prisma.flightTicket.findUnique({ where: { id: ticketId } });
    if (!existing) {
      res.status(404).json({ error: 'Flight ticket not found' });
      return;
    }

    const cleanNullable = (val: any, fallback: string | null): string | null => {
      if (val === undefined) return fallback;
      if (val === null) return null;
      const str = String(val).trim();
      return str === '' ? null : str;
    };

    // Validate tourId if provided
    let finalTourId = existing.tourId;
    if (body.tourId && String(body.tourId).trim() !== '') {
      const tourExists = await prisma.tour.findUnique({ where: { id: String(body.tourId).trim() } });
      if (!tourExists) {
        res.status(404).json({ error: 'Selected Tour not found' });
        return;
      }
      finalTourId = String(body.tourId).trim();
    }

    const tourTravellerId = cleanNullable(body.tourTravellerId, existing.tourTravellerId);
    const bookingReference = cleanNullable(body.bookingReference, existing.bookingReference);
    const ticketNumber = cleanNullable(body.ticketNumber, existing.ticketNumber);
    const internalNotes = cleanNullable(body.internalNotes, existing.internalNotes);

    // Validate dates
    const departureDateTime = body.departureDateTime ? new Date(body.departureDateTime) : existing.departureDateTime;
    const arrivalDateTime = body.arrivalDateTime ? new Date(body.arrivalDateTime) : existing.arrivalDateTime;

    if (isNaN(departureDateTime.getTime())) {
      res.status(400).json({ error: 'Invalid departure date & time format' });
      return;
    }
    if (isNaN(arrivalDateTime.getTime())) {
      res.status(400).json({ error: 'Invalid arrival date & time format' });
      return;
    }
    if (departureDateTime > arrivalDateTime) {
      res.status(400).json({ error: 'Departure date & time cannot be after arrival date & time' });
      return;
    }

    const ticket = await prisma.flightTicket.update({
      where: { id: ticketId },
      data: {
        tourId: finalTourId,
        passengerName: body.passengerName !== undefined && body.passengerName !== null ? String(body.passengerName).trim() : existing.passengerName,
        tourTravellerId,
        bookingReference,
        airline: body.airline !== undefined && body.airline !== null ? String(body.airline).trim() : existing.airline,
        flightNumber: body.flightNumber !== undefined && body.flightNumber !== null ? String(body.flightNumber).trim() : existing.flightNumber,
        departureAirport: body.departureAirport !== undefined && body.departureAirport !== null ? String(body.departureAirport).trim() : existing.departureAirport,
        arrivalAirport: body.arrivalAirport !== undefined && body.arrivalAirport !== null ? String(body.arrivalAirport).trim() : existing.arrivalAirport,
        departureDateTime,
        arrivalDateTime,
        pnr: body.pnr !== undefined && body.pnr !== null ? String(body.pnr).trim() : existing.pnr,
        ticketNumber,
        ticketStatus: body.ticketStatus !== undefined ? body.ticketStatus : existing.ticketStatus,
        internalNotes,
      },
      include: {
        tour: {
          select: {
            id: true,
            tourReference: true,
            destination: true,
            startDate: true,
            endDate: true,
            customer: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tourTraveller: true,
      },
    });

    res.status(200).json({ ticket, message: 'Flight ticket updated successfully' });
  } catch (error: any) {
    console.error('Error updating flight ticket:', error);
    res.status(400).json({ error: error.message || 'Failed to update flight ticket' });
  }
};

export const deleteFlightTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;
    await prisma.flightTicket.delete({ where: { id: ticketId } });
    res.status(200).json({ message: 'Flight ticket deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting flight ticket:', error);
    res.status(500).json({ error: 'Failed to delete flight ticket' });
  }
};

export const getTrainTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      status,
      tourId,
      passengerName,
      dateFrom,
      dateTo,
      page = '1',
      limit = '10',
      sortBy = 'departureDateTime',
      sortOrder = 'asc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.ticketStatus = status as string;
    }

    if (tourId) {
      whereClause.tourId = tourId as string;
    }

    if (passengerName) {
      whereClause.passengerName = { contains: passengerName as string, mode: 'insensitive' };
    }

    if (dateFrom || dateTo) {
      whereClause.departureDateTime = {};
      if (dateFrom) whereClause.departureDateTime.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.departureDateTime.lte = new Date(dateTo as string);
    }

    if (search) {
      const q = search as string;
      whereClause.OR = [
        { trainNumber: { contains: q, mode: 'insensitive' } },
        { pnr: { contains: q, mode: 'insensitive' } },
        { passengerName: { contains: q, mode: 'insensitive' } },
        { operator: { contains: q, mode: 'insensitive' } },
        { departureLocation: { contains: q, mode: 'insensitive' } },
        { arrivalLocation: { contains: q, mode: 'insensitive' } },
        { seatNumber: { contains: q, mode: 'insensitive' } },
        { trainClass: { contains: q, mode: 'insensitive' } },
        { tour: { tourReference: { contains: q, mode: 'insensitive' } } },
        { tour: { customer: { firstName: { contains: q, mode: 'insensitive' } } } },
        { tour: { customer: { lastName: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const validSortFields = ['departureDateTime', 'arrivalDateTime', 'createdAt', 'trainNumber', 'passengerName', 'ticketStatus'];
    const actualSortBy = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'departureDateTime';
    const actualSortOrder = (sortOrder as string).toLowerCase() === 'desc' ? 'desc' : 'asc';

    const [tickets, total] = await Promise.all([
      prisma.trainTicket.findMany({
        where: whereClause,
        include: {
          tour: {
            select: {
              id: true,
              tourReference: true,
              destination: true,
              startDate: true,
              endDate: true,
              customer: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
          tourTraveller: true,
        },
        orderBy: { [actualSortBy]: actualSortOrder },
        skip,
        take: limitNum,
      }),
      prisma.trainTicket.count({ where: whereClause }),
    ]);

    res.status(200).json({
      tickets,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching train tickets:', error);
    res.status(500).json({ error: 'Failed to fetch train tickets' });
  }
};

export const getTrainTicketById = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;
    const ticket = await prisma.trainTicket.findUnique({
      where: { id: ticketId },
      include: {
        tour: {
          select: {
            id: true,
            tourReference: true,
            destination: true,
            startDate: true,
            endDate: true,
            customer: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tourTraveller: true,
      },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Train ticket not found' });
      return;
    }

    res.status(200).json({ ticket });
  } catch (error: any) {
    console.error('Error fetching train ticket by ID:', error);
    res.status(500).json({ error: 'Failed to fetch train ticket details' });
  }
};

const trainTicketSchema = z.object({
  tourId: z.string().min(1, 'Tour ID is required'),
  passengerName: z.string().min(1, 'Passenger Name is required'),
  tourTravellerId: z.string().optional().nullable(),
  operator: z.string().min(1, 'Operator / Railway is required'),
  trainNumber: z.string().min(1, 'Train Number is required'),
  departureLocation: z.string().min(1, 'Departure Station is required'),
  arrivalLocation: z.string().min(1, 'Arrival Station is required'),
  departureDateTime: z.string().min(1, 'Departure Date & Time is required'),
  arrivalDateTime: z.string().min(1, 'Arrival Date & Time is required'),
  pnr: z.string().min(1, 'PNR / Reference is required'),
  seatNumber: z.string().optional().nullable(),
  trainClass: z.string().optional().nullable(),
  ticketStatus: z.enum(['Requested', 'Processing', 'Confirmed', 'Issued', 'Cancelled', 'Rescheduled']).default('Requested'),
  internalNotes: z.string().optional().nullable(),
});

export const createTrainTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = trainTicketSchema.parse(req.body);

    const cleanStr = (str?: string | null) => (str && str.trim() !== '' ? str.trim() : null);

    const ticket = await prisma.trainTicket.create({
      data: {
        tourId: validated.tourId.trim(),
        passengerName: validated.passengerName.trim(),
        tourTravellerId: cleanStr(validated.tourTravellerId),
        operator: validated.operator.trim(),
        trainNumber: validated.trainNumber.trim(),
        departureLocation: validated.departureLocation.trim(),
        arrivalLocation: validated.arrivalLocation.trim(),
        departureDateTime: new Date(validated.departureDateTime),
        arrivalDateTime: new Date(validated.arrivalDateTime),
        pnr: validated.pnr.trim(),
        seatNumber: cleanStr(validated.seatNumber),
        trainClass: cleanStr(validated.trainClass),
        ticketStatus: validated.ticketStatus,
        internalNotes: cleanStr(validated.internalNotes),
      },
      include: {
        tour: {
          select: {
            id: true,
            tourReference: true,
            destination: true,
            startDate: true,
            endDate: true,
            customer: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tourTraveller: true,
      },
    });

    res.status(201).json({ ticket, message: 'Train ticket created successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Validation error' });
      return;
    }
    console.error('Error creating train ticket:', error);
    res.status(500).json({ error: 'Failed to create train ticket' });
  }
};

export const updateTrainTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;
    const body = req.body;

    const existing = await prisma.trainTicket.findUnique({ where: { id: ticketId } });
    if (!existing) {
      res.status(404).json({ error: 'Train ticket not found' });
      return;
    }

    const cleanNullable = (val: any, fallback: string | null): string | null => {
      if (val === undefined) return fallback;
      if (val === null) return null;
      const str = String(val).trim();
      return str === '' ? null : str;
    };

    let finalTourId = existing.tourId;
    if (body.tourId && String(body.tourId).trim() !== '') {
      const tourExists = await prisma.tour.findUnique({ where: { id: String(body.tourId).trim() } });
      if (!tourExists) {
        res.status(404).json({ error: 'Selected Tour not found' });
        return;
      }
      finalTourId = String(body.tourId).trim();
    }

    const tourTravellerId = cleanNullable(body.tourTravellerId, existing.tourTravellerId);
    const seatNumber = cleanNullable(body.seatNumber, existing.seatNumber);
    const trainClass = cleanNullable(body.trainClass, existing.trainClass);
    const internalNotes = cleanNullable(body.internalNotes, existing.internalNotes);

    const departureDateTime = body.departureDateTime ? new Date(body.departureDateTime) : existing.departureDateTime;
    const arrivalDateTime = body.arrivalDateTime ? new Date(body.arrivalDateTime) : existing.arrivalDateTime;

    if (isNaN(departureDateTime.getTime())) {
      res.status(400).json({ error: 'Invalid departure date & time format' });
      return;
    }
    if (isNaN(arrivalDateTime.getTime())) {
      res.status(400).json({ error: 'Invalid arrival date & time format' });
      return;
    }

    const ticket = await prisma.trainTicket.update({
      where: { id: ticketId },
      data: {
        tourId: finalTourId,
        passengerName: body.passengerName !== undefined && body.passengerName !== null ? String(body.passengerName).trim() : existing.passengerName,
        tourTravellerId,
        operator: body.operator !== undefined && body.operator !== null ? String(body.operator).trim() : existing.operator,
        trainNumber: body.trainNumber !== undefined && body.trainNumber !== null ? String(body.trainNumber).trim() : existing.trainNumber,
        departureLocation: body.departureLocation !== undefined && body.departureLocation !== null ? String(body.departureLocation).trim() : existing.departureLocation,
        arrivalLocation: body.arrivalLocation !== undefined && body.arrivalLocation !== null ? String(body.arrivalLocation).trim() : existing.arrivalLocation,
        departureDateTime,
        arrivalDateTime,
        pnr: body.pnr !== undefined && body.pnr !== null ? String(body.pnr).trim() : existing.pnr,
        seatNumber,
        trainClass,
        ticketStatus: body.ticketStatus !== undefined ? body.ticketStatus : existing.ticketStatus,
        internalNotes,
      },
      include: {
        tour: {
          select: {
            id: true,
            tourReference: true,
            destination: true,
            startDate: true,
            endDate: true,
            customer: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tourTraveller: true,
      },
    });

    res.status(200).json({ ticket, message: 'Train ticket updated successfully' });
  } catch (error: any) {
    console.error('Error updating train ticket:', error);
    res.status(400).json({ error: error.message || 'Failed to update train ticket' });
  }
};

export const deleteTrainTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;
    await prisma.trainTicket.delete({ where: { id: ticketId } });
    res.status(200).json({ message: 'Train ticket deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting train ticket:', error);
    res.status(500).json({ error: 'Failed to delete train ticket' });
  }
};

export const getBusTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      status,
      tourId,
      passengerName,
      dateFrom,
      dateTo,
      page = '1',
      limit = '10',
      sortBy = 'departureDateTime',
      sortOrder = 'asc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.ticketStatus = status as string;
    }

    if (tourId) {
      whereClause.tourId = tourId as string;
    }

    if (passengerName) {
      whereClause.passengerName = { contains: passengerName as string, mode: 'insensitive' };
    }

    if (dateFrom || dateTo) {
      whereClause.departureDateTime = {};
      if (dateFrom) whereClause.departureDateTime.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.departureDateTime.lte = new Date(dateTo as string);
    }

    if (search) {
      const q = search as string;
      whereClause.OR = [
        { busNumber: { contains: q, mode: 'insensitive' } },
        { pnr: { contains: q, mode: 'insensitive' } },
        { passengerName: { contains: q, mode: 'insensitive' } },
        { operator: { contains: q, mode: 'insensitive' } },
        { departureLocation: { contains: q, mode: 'insensitive' } },
        { arrivalLocation: { contains: q, mode: 'insensitive' } },
        { seatNumber: { contains: q, mode: 'insensitive' } },
        { busClass: { contains: q, mode: 'insensitive' } },
        { tour: { tourReference: { contains: q, mode: 'insensitive' } } },
        { tour: { customer: { firstName: { contains: q, mode: 'insensitive' } } } },
        { tour: { customer: { lastName: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const validSortFields = ['departureDateTime', 'arrivalDateTime', 'createdAt', 'busNumber', 'passengerName', 'ticketStatus'];
    const actualSortBy = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'departureDateTime';
    const actualSortOrder = (sortOrder as string).toLowerCase() === 'desc' ? 'desc' : 'asc';

    const [tickets, total] = await Promise.all([
      prisma.busTicket.findMany({
        where: whereClause,
        include: {
          tour: {
            select: {
              id: true,
              tourReference: true,
              destination: true,
              startDate: true,
              endDate: true,
              customer: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
          tourTraveller: true,
        },
        orderBy: { [actualSortBy]: actualSortOrder },
        skip,
        take: limitNum,
      }),
      prisma.busTicket.count({ where: whereClause }),
    ]);

    res.status(200).json({
      tickets,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching bus tickets:', error);
    res.status(500).json({ error: 'Failed to fetch bus tickets' });
  }
};

export const getBusTicketById = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;
    const ticket = await prisma.busTicket.findUnique({
      where: { id: ticketId },
      include: {
        tour: {
          select: {
            id: true,
            tourReference: true,
            destination: true,
            startDate: true,
            endDate: true,
            customer: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tourTraveller: true,
      },
    });

    if (!ticket) {
      res.status(404).json({ error: 'Bus ticket not found' });
      return;
    }

    res.status(200).json({ ticket });
  } catch (error: any) {
    console.error('Error fetching bus ticket by ID:', error);
    res.status(500).json({ error: 'Failed to fetch bus ticket details' });
  }
};

const busTicketSchema = z.object({
  tourId: z.string().min(1, 'Tour ID is required'),
  passengerName: z.string().min(1, 'Passenger Name is required'),
  tourTravellerId: z.string().optional().nullable(),
  operator: z.string().min(1, 'Bus Operator is required'),
  busNumber: z.string().optional().nullable(),
  departureLocation: z.string().min(1, 'Departure Boarding Point is required'),
  arrivalLocation: z.string().min(1, 'Arrival Dropoff Point is required'),
  departureDateTime: z.string().min(1, 'Departure Date & Time is required'),
  arrivalDateTime: z.string().min(1, 'Arrival Date & Time is required'),
  pnr: z.string().min(1, 'PNR / Reference is required'),
  seatNumber: z.string().optional().nullable(),
  busClass: z.string().optional().nullable(),
  ticketStatus: z.enum(['Requested', 'Processing', 'Confirmed', 'Issued', 'Cancelled', 'Rescheduled']).default('Requested'),
  internalNotes: z.string().optional().nullable(),
});

export const createBusTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = busTicketSchema.parse(req.body);

    const cleanStr = (str?: string | null) => (str && str.trim() !== '' ? str.trim() : null);

    const ticket = await prisma.busTicket.create({
      data: {
        tourId: validated.tourId.trim(),
        passengerName: validated.passengerName.trim(),
        tourTravellerId: cleanStr(validated.tourTravellerId),
        operator: validated.operator.trim(),
        busNumber: cleanStr(validated.busNumber),
        departureLocation: validated.departureLocation.trim(),
        arrivalLocation: validated.arrivalLocation.trim(),
        departureDateTime: new Date(validated.departureDateTime),
        arrivalDateTime: new Date(validated.arrivalDateTime),
        pnr: validated.pnr.trim(),
        seatNumber: cleanStr(validated.seatNumber),
        busClass: cleanStr(validated.busClass),
        ticketStatus: validated.ticketStatus,
        internalNotes: cleanStr(validated.internalNotes),
      },
      include: {
        tour: {
          select: {
            id: true,
            tourReference: true,
            destination: true,
            startDate: true,
            endDate: true,
            customer: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tourTraveller: true,
      },
    });

    res.status(201).json({ ticket, message: 'Bus ticket created successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Validation error' });
      return;
    }
    console.error('Error creating bus ticket:', error);
    res.status(500).json({ error: 'Failed to create bus ticket' });
  }
};

export const updateBusTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;
    const body = req.body;

    const existing = await prisma.busTicket.findUnique({ where: { id: ticketId } });
    if (!existing) {
      res.status(404).json({ error: 'Bus ticket not found' });
      return;
    }

    const cleanNullable = (val: any, fallback: string | null): string | null => {
      if (val === undefined) return fallback;
      if (val === null) return null;
      const str = String(val).trim();
      return str === '' ? null : str;
    };

    let finalTourId = existing.tourId;
    if (body.tourId && String(body.tourId).trim() !== '') {
      const tourExists = await prisma.tour.findUnique({ where: { id: String(body.tourId).trim() } });
      if (!tourExists) {
        res.status(404).json({ error: 'Selected Tour not found' });
        return;
      }
      finalTourId = String(body.tourId).trim();
    }

    const tourTravellerId = cleanNullable(body.tourTravellerId, existing.tourTravellerId);
    const busNumber = cleanNullable(body.busNumber, existing.busNumber);
    const seatNumber = cleanNullable(body.seatNumber, existing.seatNumber);
    const busClass = cleanNullable(body.busClass, existing.busClass);
    const internalNotes = cleanNullable(body.internalNotes, existing.internalNotes);

    const departureDateTime = body.departureDateTime ? new Date(body.departureDateTime) : existing.departureDateTime;
    const arrivalDateTime = body.arrivalDateTime ? new Date(body.arrivalDateTime) : existing.arrivalDateTime;

    if (isNaN(departureDateTime.getTime())) {
      res.status(400).json({ error: 'Invalid departure date & time format' });
      return;
    }
    if (isNaN(arrivalDateTime.getTime())) {
      res.status(400).json({ error: 'Invalid arrival date & time format' });
      return;
    }

    const ticket = await prisma.busTicket.update({
      where: { id: ticketId },
      data: {
        tourId: finalTourId,
        passengerName: body.passengerName !== undefined && body.passengerName !== null ? String(body.passengerName).trim() : existing.passengerName,
        tourTravellerId,
        operator: body.operator !== undefined && body.operator !== null ? String(body.operator).trim() : existing.operator,
        busNumber,
        departureLocation: body.departureLocation !== undefined && body.departureLocation !== null ? String(body.departureLocation).trim() : existing.departureLocation,
        arrivalLocation: body.arrivalLocation !== undefined && body.arrivalLocation !== null ? String(body.arrivalLocation).trim() : existing.arrivalLocation,
        departureDateTime,
        arrivalDateTime,
        pnr: body.pnr !== undefined && body.pnr !== null ? String(body.pnr).trim() : existing.pnr,
        seatNumber,
        busClass,
        ticketStatus: body.ticketStatus !== undefined ? body.ticketStatus : existing.ticketStatus,
        internalNotes,
      },
      include: {
        tour: {
          select: {
            id: true,
            tourReference: true,
            destination: true,
            startDate: true,
            endDate: true,
            customer: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tourTraveller: true,
      },
    });

    res.status(200).json({ ticket, message: 'Bus ticket updated successfully' });
  } catch (error: any) {
    console.error('Error updating bus ticket:', error);
    res.status(400).json({ error: error.message || 'Failed to update bus ticket' });
  }
};

export const deleteBusTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticketId = req.params.ticketId as string;
    await prisma.busTicket.delete({ where: { id: ticketId } });
    res.status(200).json({ message: 'Bus ticket deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting bus ticket:', error);
    res.status(500).json({ error: 'Failed to delete bus ticket' });
  }
};

// ----------------------------------------------------
// 9. HOTEL RESERVATION MANAGEMENT (/admin/operations/hotels)
// ----------------------------------------------------
const hotelReservationSchema = z.object({
  tourId: z.string().optional().nullable(),
  customerId: z.string().min(1, 'Customer is required'),
  hotelName: z.string().min(1, 'Hotel Name is required'),
  destination: z.string().min(1, 'Destination is required'),
  vendorReference: z.string().optional().nullable(),
  bookingReference: z.string().optional().nullable(),
  roomType: z.string().optional().nullable(),
  numberOfRooms: z.number().int().min(1).default(1),
  numberOfGuests: z.number().int().min(1).default(1),
  checkInDate: z.string().min(1, 'Check-in Date is required'),
  checkOutDate: z.string().min(1, 'Check-out Date is required'),
  mealPlan: z.string().optional().nullable(),
  confirmationNumber: z.string().optional().nullable(),
  reservationStatus: z.enum(['Requested', 'Pending', 'Confirmed', 'Modified', 'Cancelled', 'Completed']).default('Requested'),
  internalNotes: z.string().optional().nullable(),
});

export const getHotelReservations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, tourId, customerId, page = '1', limit = '10', sortBy = 'checkInDate', sortOrder = 'asc' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.reservationStatus = status as string;
    }

    if (tourId) {
      whereClause.tourId = tourId as string;
    }

    if (customerId) {
      whereClause.customerId = customerId as string;
    }

    if (search) {
      const q = search as string;
      whereClause.OR = [
        { hotelName: { contains: q, mode: 'insensitive' } },
        { destination: { contains: q, mode: 'insensitive' } },
        { confirmationNumber: { contains: q, mode: 'insensitive' } },
        { bookingReference: { contains: q, mode: 'insensitive' } },
        { customer: { firstName: { contains: q, mode: 'insensitive' } } },
        { customer: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const validSortFields = ['checkInDate', 'checkOutDate', 'hotelName', 'destination', 'createdAt', 'reservationStatus'];
    const actualSortBy = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'checkInDate';
    const actualSortOrder = (sortOrder as string).toLowerCase() === 'desc' ? 'desc' : 'asc';

    const [reservations, total] = await Promise.all([
      prisma.hotelReservation.findMany({
        where: whereClause,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          tour: { select: { id: true, tourReference: true, destination: true, startDate: true, endDate: true } },
        },
        orderBy: { [actualSortBy]: actualSortOrder },
        skip,
        take: limitNum,
      }),
      prisma.hotelReservation.count({ where: whereClause }),
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
    console.error('Error fetching hotel reservations:', error);
    res.status(500).json({ error: 'Failed to fetch hotel reservations' });
  }
};

export const createHotelReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = hotelReservationSchema.parse(req.body);

    const reservation = await prisma.hotelReservation.create({
      data: {
        tourId: validated.tourId || null,
        customerId: validated.customerId,
        hotelName: validated.hotelName,
        destination: validated.destination,
        vendorReference: validated.vendorReference || null,
        bookingReference: validated.bookingReference || null,
        roomType: validated.roomType || null,
        numberOfRooms: validated.numberOfRooms,
        numberOfGuests: validated.numberOfGuests,
        checkInDate: new Date(validated.checkInDate),
        checkOutDate: new Date(validated.checkOutDate),
        mealPlan: validated.mealPlan || null,
        confirmationNumber: validated.confirmationNumber || null,
        reservationStatus: validated.reservationStatus,
        internalNotes: validated.internalNotes || null,
      },
      include: {
        customer: true,
        tour: true,
      },
    });

    res.status(201).json({ reservation, message: 'Hotel reservation created successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message || 'Validation error' });
      return;
    }
    console.error('Error creating hotel reservation:', error);
    res.status(500).json({ error: 'Failed to create hotel reservation' });
  }
};

export const updateHotelReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const body = req.body;

    const existing = await prisma.hotelReservation.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Hotel reservation not found' });
      return;
    }

    const reservation = await prisma.hotelReservation.update({
      where: { id },
      data: {
        tourId: body.tourId ? body.tourId : (body.tourId === '' ? null : existing.tourId),
        customerId: body.customerId ? body.customerId : existing.customerId,
        hotelName: body.hotelName !== undefined ? body.hotelName : existing.hotelName,
        destination: body.destination !== undefined ? body.destination : existing.destination,
        vendorReference: body.vendorReference !== undefined ? (body.vendorReference || null) : existing.vendorReference,
        bookingReference: body.bookingReference !== undefined ? (body.bookingReference || null) : existing.bookingReference,
        roomType: body.roomType !== undefined ? (body.roomType || null) : existing.roomType,
        numberOfRooms: body.numberOfRooms !== undefined ? parseInt(body.numberOfRooms, 10) : existing.numberOfRooms,
        numberOfGuests: body.numberOfGuests !== undefined ? parseInt(body.numberOfGuests, 10) : existing.numberOfGuests,
        checkInDate: body.checkInDate ? new Date(body.checkInDate) : existing.checkInDate,
        checkOutDate: body.checkOutDate ? new Date(body.checkOutDate) : existing.checkOutDate,
        mealPlan: body.mealPlan !== undefined ? (body.mealPlan || null) : existing.mealPlan,
        confirmationNumber: body.confirmationNumber !== undefined ? (body.confirmationNumber || null) : existing.confirmationNumber,
        reservationStatus: body.reservationStatus !== undefined ? body.reservationStatus : existing.reservationStatus,
        internalNotes: body.internalNotes !== undefined ? (body.internalNotes || null) : existing.internalNotes,
      },
      include: {
        customer: true,
        tour: true,
      },
    });

    res.status(200).json({ reservation, message: 'Hotel reservation updated successfully' });
  } catch (error: any) {
    console.error('Error updating hotel reservation:', error);
    res.status(500).json({ error: error?.message || 'Failed to update hotel reservation' });
  }
};

export const deleteHotelReservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.hotelReservation.delete({ where: { id } });
    res.status(200).json({ message: 'Hotel reservation deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting hotel reservation:', error);
    res.status(500).json({ error: 'Failed to delete hotel reservation' });
  }
};
