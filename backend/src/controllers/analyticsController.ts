import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { generatePnLStatement } from '../services/pnlService';

// Date Range Parsing Helper
function parseFilterDates(req: Request) {
  const period = (req.query.period as string) || 'this_month';
  const customStart = req.query.startDate as string;
  const customEnd = req.query.endDate as string;
  
  const now = new Date();
  let gte = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  let lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  let prevGte: Date | null = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
  let prevLte: Date | null = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  if (period === 'all' || period === 'all_time') {
    gte = new Date(0);
    lte = new Date('2099-12-31T23:59:59.999Z');
    prevGte = null;
    prevLte = null;
  } else if (period === 'today') {
    gte = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    lte = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    prevGte = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    prevLte = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
  } else if (period === 'this_week' || period === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    gte = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
    lte = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59);
    prevGte = new Date(gte.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevLte = new Date(lte.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === 'this_month' || period === 'month') {
    gte = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    prevGte = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    prevLte = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else if (period === 'previous_month') {
    gte = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    lte = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    prevGte = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0);
    prevLte = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
  } else if (period === 'this_year' || period === 'year') {
    gte = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    lte = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    prevGte = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
    prevLte = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
  } else if (period === 'previous_year') {
    gte = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
    lte = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    prevGte = new Date(now.getFullYear() - 2, 0, 1, 0, 0, 0);
    prevLte = new Date(now.getFullYear() - 2, 11, 31, 23, 59, 59);
  } else if (period === 'custom' && customStart && customEnd) {
    gte = new Date(`${customStart}T00:00:00`);
    lte = new Date(`${customEnd}T23:59:59`);
    const diffMs = lte.getTime() - gte.getTime();
    prevGte = new Date(gte.getTime() - diffMs);
    prevLte = new Date(gte.getTime() - 1);
  } else {
    prevGte = null;
    prevLte = null;
  }

  return { gte, lte, prevGte, prevLte };
}

function calculateChange(current: number, previous: number | null) {
  if (previous === null || previous === undefined || previous === 0) {
    return { changePercentage: null, hasComparison: false, previousValue: null };
  }
  const change = ((current - previous) / previous) * 100;
  return { changePercentage: Number(change.toFixed(1)), hasComparison: true, previousValue: previous };
}

// 1. CEO OVERVIEW METRICS
export const getCEOOverviewMetrics = async (req: Request, res: Response) => {
  try {
    const { gte, lte, prevGte, prevLte } = parseFilterDates(req);
    const now = new Date();

    // Query Filters
    const packageId = req.query.packageId as string | undefined;
    const destination = req.query.destination as string | undefined;
    const source = req.query.source as string | undefined;
    const groupTourId = req.query.groupTourId as string | undefined;

    const enquiryWhere: any = { createdAt: { gte, lte } };
    const prevEnquiryWhere: any = prevGte && prevLte ? { createdAt: { gte: prevGte, lte: prevLte } } : null;
    
    if (source) enquiryWhere.source = source;
    if (packageId) enquiryWhere.packageId = packageId;
    if (destination) enquiryWhere.destination = destination;

    // --- PERIOD-BASED METRICS ---
    const periodEnquiries = await prisma.enquiry.count({ where: enquiryWhere });
    
    // All-time enquiries for the KPI (to match Admin -> Enquiries count)
    const allTimeEnquiryWhere: any = {};
    if (source) allTimeEnquiryWhere.source = source;
    if (packageId) allTimeEnquiryWhere.packageId = packageId;
    if (destination) allTimeEnquiryWhere.destination = destination;
    const totalEnquiries = await prisma.enquiry.count({ where: allTimeEnquiryWhere });

    // Regular Tours
    const tourWhere: any = { createdAt: { gte, lte } };
    if (packageId) tourWhere.packageId = packageId;
    if (destination) tourWhere.destination = destination;

    const totalRegularBookings = await prisma.tour.count({ where: tourWhere });
    const confirmedRegularBookings = await prisma.tour.count({
      where: { ...tourWhere, status: { in: ['Confirmed', 'CONFIRMED', 'Completed', 'COMPLETED', 'Ongoing', 'ONGOING'] } }
    });
    const cancelledRegularBookings = await prisma.tour.count({
      where: { ...tourWhere, status: { in: ['Cancelled', 'CANCELLED'] } }
    });

    // Group Tour Bookings
    const gtWhereFilter: any = {};
    if (packageId) gtWhereFilter.packageId = packageId;
    if (destination) gtWhereFilter.destination = destination;
    if (groupTourId) gtWhereFilter.id = groupTourId;

    const groupTourBookingWhere: any = { createdAt: { gte, lte } };
    if (Object.keys(gtWhereFilter).length > 0) {
      groupTourBookingWhere.groupTour = gtWhereFilter;
    }

    const gtBookings = await prisma.groupTourBooking.findMany({
      where: groupTourBookingWhere,
      include: { groupTour: true }
    });

    const confirmedGtBookings = gtBookings.filter(b => b.status === 'CONFIRMED');
    const cancelledGtBookings = gtBookings.filter(b => b.status === 'CANCELLED');

    const groupTourRevenue = confirmedGtBookings.reduce((sum, b) => {
      const price = Number(b.groupTour.pricePerPerson || 0);
      return sum + (b.numberOfPeople * price);
    }, 0);

    const totalBookings = totalRegularBookings + gtBookings.length;
    const confirmedBookings = confirmedRegularBookings + confirmedGtBookings.length;
    const cancelledBookings = cancelledRegularBookings + cancelledGtBookings.length;

    // Revenue & Expense
    // Use the single source of truth PnL Service to ensure all dashboards match
    const pnl = await generatePnLStatement({ startDate: gte, endDate: lte });
    
    const totalRevenue = pnl.revenue.total;
    const totalExpenses = pnl.expenses.total;
    const netProfit = pnl.profitability.netProfit;

    // --- LIFETIME / OPERATIONAL METRICS ---
    const upcomingRegularTours = await prisma.tour.count({
      where: { startDate: { gt: now }, status: { notIn: ['Cancelled', 'CANCELLED'] } }
    });
    const ongoingRegularTours = await prisma.tour.count({
      where: { startDate: { lte: now }, endDate: { gte: now }, status: { notIn: ['Cancelled', 'CANCELLED'] } }
    });
    const completedRegularTours = await prisma.tour.count({
      where: { endDate: { lt: now }, status: { notIn: ['Cancelled', 'CANCELLED'] } }
    });

    const allGroupTours = await prisma.groupTour.findMany({
      where: gtWhereFilter
    });
    const upcomingGt = allGroupTours.filter(gt => new Date(gt.startDate) > now && gt.status !== 'Cancelled' && gt.status !== 'CANCELLED').length;
    const ongoingGt = allGroupTours.filter(gt => new Date(gt.startDate) <= now && new Date(gt.endDate) >= now && gt.status !== 'Cancelled' && gt.status !== 'CANCELLED').length;
    const completedGt = allGroupTours.filter(gt => new Date(gt.endDate) < now || gt.status === 'Completed' || gt.status === 'COMPLETED').length;

    const upcomingTours = upcomingRegularTours + upcomingGt;
    const ongoingTours = ongoingRegularTours + ongoingGt;
    const completedTours = completedRegularTours + completedGt;

    const totalCustomers = await prisma.customer.count();
    const pendingQuotations = await prisma.quotation.count({
      where: { status: { in: ['DRAFT', 'SENT', 'PENDING'] } }
    });

    // Outstanding Balance (Exact Unpaid Balance from Confirmed Bookings matching Accounting module)
    const activeBookingsForOutstanding = await prisma.bookingPreparation.findMany({
      where: {
        status: { not: 'CANCELLED' },
        createdAt: { gte, lte }
      },
      include: {
        quotation: {
          include: { payments: { include: { transaction: true } } }
        },
        payments: { include: { transaction: true } }
      }
    });

    let outstandingPayments = 0;
    activeBookingsForOutstanding.forEach(b => {
      const allPayments = [
        ...(b.payments || []),
        ...(b.quotation?.payments || [])
      ];
      
      // Deduplicate payments to prevent duplicate counting
      const uniquePaymentsMap = new Map();
      allPayments.forEach(p => {
        if (p.transaction?.status === 'COMPLETED') {
          uniquePaymentsMap.set(p.id, p.transaction.amount);
        }
      });
      
      let paid = 0;
      uniquePaymentsMap.forEach(amount => { paid += amount; });
      
      // Only consider active bookings that have received a valid payment (excludes unrelated dummy quotes)
      if (paid > 0) {
        const totalAmount = b.quotation?.basePrice || b.taxableAmount || 0;
        const remaining = totalAmount - paid;
        if (remaining > 0) outstandingPayments += remaining;
      }
    });

    // Previous Period Comparisons
    let prevEnquiries: number | null = null;
    let prevRevenue: number | null = null;
    let prevExpenses: number | null = null;
    let prevBookings: number | null = null;
    let prevProfit: number | null = null;

    if (prevGte && prevLte) {
      prevEnquiries = await prisma.enquiry.count({ where: prevEnquiryWhere });
      const prevRegularBookingsCount = await prisma.tour.count({ where: { createdAt: { gte: prevGte, lte: prevLte } } });

      const prevGtBookingWhere: any = { createdAt: { gte: prevGte, lte: prevLte } };
      if (Object.keys(gtWhereFilter).length > 0) {
        prevGtBookingWhere.groupTour = gtWhereFilter;
      }
      const prevGtBookings = await prisma.groupTourBooking.findMany({
        where: prevGtBookingWhere,
        include: { groupTour: true }
      });
      const prevGtConfirmed = prevGtBookings.filter(b => b.status === 'CONFIRMED');
      const prevGtRevenue = prevGtConfirmed.reduce((sum, b) => sum + (b.numberOfPeople * Number(b.groupTour.pricePerPerson || 0)), 0);

      prevBookings = prevRegularBookingsCount + prevGtBookings.length;

      const prevRevAgg = await prisma.revenueRecord.aggregate({
        _sum: { amount: true },
        where: { date: { gte: prevGte, lte: prevLte } }
      });
      const prevIncomeAgg = await prisma.financialTransaction.aggregate({
        _sum: { amount: true },
        where: { date: { gte: prevGte, lte: prevLte }, type: 'INCOME', status: 'COMPLETED' }
      });
      prevRevenue = (prevRevAgg._sum.amount || 0) + (prevIncomeAgg._sum.amount || 0) + prevGtRevenue;

      const prevExpAgg = await prisma.expense.aggregate({
        _sum: { totalAmount: true },
        where: { expenseDate: { gte: prevGte, lte: prevLte }, status: { notIn: ['CANCELLED', 'REJECTED'] } }
      });
      prevExpenses = prevExpAgg._sum.totalAmount || 0;
      prevProfit = prevRevenue - prevExpenses;
    }

    const enquiriesComparison = calculateChange(periodEnquiries, prevEnquiries);
    const bookingsComparison = calculateChange(totalBookings, prevBookings);
    const revenueComparison = calculateChange(totalRevenue, prevRevenue);
    const expensesComparison = calculateChange(totalExpenses, prevExpenses);
    const profitComparison = calculateChange(netProfit, prevProfit);

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit,
          outstandingPayments,
          totalEnquiries,
          totalBookings,
          confirmedBookings,
          cancelledBookings,
          upcomingTours,
          ongoingTours,
          completedTours,
          totalCustomers,
          pendingQuotations,
        },
        comparisons: {
          revenue: revenueComparison,
          expenses: expensesComparison,
          profit: profitComparison,
          enquiries: enquiriesComparison,
          bookings: bookingsComparison,
        },
        period: req.query.period || 'this_month',
        dateRange: { gte, lte }
      }
    });
  } catch (error) {
    console.error('CEO overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch CEO overview metrics' });
  }
};

// 2. SALES ANALYTICS
export const getSalesAnalytics = async (req: Request, res: Response) => {
  try {
    const { gte, lte } = parseFilterDates(req);
    const now = new Date();

    // Query Filters
    const packageId = req.query.packageId as string | undefined;
    const destination = req.query.destination as string | undefined;
    const source = req.query.source as string | undefined;

    const enquiryWhere: any = { createdAt: { gte, lte } };
    if (source) enquiryWhere.source = source;
    if (packageId) enquiryWhere.packageId = packageId;
    if (destination) enquiryWhere.destination = destination;

    // 1. Core Quotation Status Breakdown
    const totalQuotations = await prisma.quotation.count({ where: { createdAt: { gte, lte } } });
    const acceptedQuotations = await prisma.quotation.count({ where: { createdAt: { gte, lte }, status: 'APPROVED' } });
    const rejectedQuotations = await prisma.quotation.count({ where: { createdAt: { gte, lte }, status: 'REJECTED' } });
    const expiredQuotations = await prisma.quotation.count({ where: { createdAt: { gte, lte }, status: 'EXPIRED' } });
    const pendingQuotations = await prisma.quotation.count({
      where: { createdAt: { gte, lte }, status: { in: ['DRAFT', 'SENT', 'PENDING'] } }
    });

    const totalEnquiries = await prisma.enquiry.count({ where: enquiryWhere });
    const convertedEnquiries = await prisma.enquiry.count({
      where: { ...enquiryWhere, status: 'CONVERTED' }
    });
    const conversionRate = totalEnquiries > 0 ? Number(((convertedEnquiries / totalEnquiries) * 100).toFixed(1)) : 0;

    // 2. Conversion Funnel Data
    const newCount = await prisma.enquiry.count({ where: { ...enquiryWhere, status: 'NEW' } });
    const contactedCount = await prisma.enquiry.count({ where: { ...enquiryWhere, status: 'CONTACTED' } });
    const reqCount = await prisma.enquiry.count({ where: { ...enquiryWhere, status: 'REQUIREMENT_COLLECTION' } });
    const quoteCount = await prisma.enquiry.count({ where: { ...enquiryWhere, status: { in: ['QUOTATION_PREPARATION', 'QUOTATION_SENT'] } } });

    const funnel = [
      { stage: 'New Enquiries', count: newCount || totalEnquiries },
      { stage: 'Contacted', count: contactedCount + reqCount + quoteCount + convertedEnquiries },
      { stage: 'Quotation Sent', count: quoteCount + convertedEnquiries },
      { stage: 'Converted (Won)', count: convertedEnquiries },
    ];

    // 3. Source Distribution
    const sourceGroups = await prisma.enquiry.groupBy({
      by: ['source'],
      _count: { id: true },
      where: enquiryWhere
    });
    const sourceDistribution = sourceGroups.map(s => ({
      source: s.source ? s.source.replace(/_/g, ' ') : 'Direct',
      count: s._count.id
    }));

    // 4. Timeline Data: Enquiries & Bookings Over Time
    const enquiriesList = await prisma.enquiry.findMany({
      where: enquiryWhere,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    const timelineMap: Record<string, { date: string; enquiries: number; bookings: number }> = {};
    enquiriesList.forEach(e => {
      const dateKey = e.createdAt.toISOString().split('T')[0];
      if (!timelineMap[dateKey]) timelineMap[dateKey] = { date: dateKey, enquiries: 0, bookings: 0 };
      timelineMap[dateKey].enquiries += 1;
    });

    const toursList = await prisma.tour.findMany({
      where: { createdAt: { gte, lte }, status: { in: ['Confirmed', 'CONFIRMED', 'Completed', 'COMPLETED', 'Ongoing', 'ONGOING'] } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    toursList.forEach(t => {
      const dateKey = t.createdAt.toISOString().split('T')[0];
      if (!timelineMap[dateKey]) timelineMap[dateKey] = { date: dateKey, enquiries: 0, bookings: 0 };
      timelineMap[dateKey].bookings += 1;
    });

    const gtBookingsTimeline = await prisma.groupTourBooking.findMany({
      where: { createdAt: { gte, lte }, status: 'CONFIRMED' },
      select: { createdAt: true }
    });

    gtBookingsTimeline.forEach(gtb => {
      const dateKey = gtb.createdAt.toISOString().split('T')[0];
      if (!timelineMap[dateKey]) timelineMap[dateKey] = { date: dateKey, enquiries: 0, bookings: 0 };
      timelineMap[dateKey].bookings += 1;
    });

    const timelineData = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    // 5. Salesperson Performance Table
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        assignedEnquiries: { where: { assignedAt: { gte, lte } } },
        followUps: { where: { createdAt: { gte, lte } } },
        assignedLeads: { where: { createdAt: { gte, lte } } },
        toursCoordinated: { where: { createdAt: { gte, lte } } },
        createdGroupTours: {
          where: { createdAt: { gte, lte } },
          include: { bookings: { where: { status: 'CONFIRMED' } } }
        }
      }
    });

    const salespersonPerformance = await Promise.all(employees.map(async (emp: any) => {
      const enquiriesHandled = emp.assignedEnquiries ? emp.assignedEnquiries.length : 0;
      
      const empFollowUpWhere: any = {
        status: { notIn: ['CANCELLED', 'DELETED'] },
        employeeId: emp.id
      };
      if (gte && lte) {
        empFollowUpWhere.AND = [
          {
            OR: [
              { scheduledFor: { gte, lte } },
              { createdAt: { gte, lte } }
            ]
          }
        ];
      }
      const rawEmpFollowUps = await prisma.followUp.findMany({ where: empFollowUpWhere });
      // Deduplicate strictly by primary key ID (single source of truth)
      const empFollowUpMap = new Map<string, any>();
      rawEmpFollowUps.forEach((f: any) => empFollowUpMap.set(f.id, f));
      const empFollowUps = Array.from(empFollowUpMap.values());

      const followUpsCount = empFollowUps.length;
      const followUpsCompleted = empFollowUps.filter((f: any) => f.status === 'COMPLETED').length;

      const quotationsCreated = emp.assignedLeads ? emp.assignedLeads.length : 0;

      const regularConfirmed = (emp.assignedLeads ? emp.assignedLeads.filter((l: any) => l.status === 'WON').length : 0) + (emp.toursCoordinated ? emp.toursCoordinated.length : 0);
      
      const gtBookings = emp.createdGroupTours
        ? emp.createdGroupTours.flatMap((gt: any) => gt.bookings || [])
        : [];
      const gtConfirmedBookings = gtBookings.length;
      const gtRevenue = emp.createdGroupTours
        ? emp.createdGroupTours.reduce((sum: number, gt: any) => {
            const price = Number(gt.pricePerPerson || 0);
            const bookedSlots = (gt.bookings || []).reduce((bSum: number, b: any) => bSum + b.numberOfPeople, 0);
            return sum + (bookedSlots * price);
          }, 0)
        : 0;

      const confirmedBookings = regularConfirmed + gtConfirmedBookings;
      const empConversionRate = enquiriesHandled > 0 ? Number(((confirmedBookings / enquiriesHandled) * 100).toFixed(1)) : 0;
      const regularRevenue = emp.assignedLeads
        ? emp.assignedLeads
            .filter((l: any) => l.status === 'WON')
            .reduce((sum: number, l: any) => sum + (l.expectedValue || 0), 0)
        : 0;
      const revenueGenerated = regularRevenue + gtRevenue;

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        enquiriesHandled,
        followUpsCount,
        followUpsCompleted,
        quotationsCreated,
        confirmedBookings,
        conversionRate: empConversionRate,
        revenueGenerated
      };
    }));

    // 6. Sales by Package Table
    const packages = await prisma.travelPackage.findMany({
      include: {
        crmEnquiries: { where: { createdAt: { gte, lte } } },
        tours: { where: { createdAt: { gte, lte } } },
        groupTours: {
          where: { createdAt: { gte, lte } },
          include: { bookings: { where: { status: 'CONFIRMED' } } }
        },
        destination: { select: { name: true } }
      }
    });

    const salesByPackage = packages.map((pkg: any) => {
      const enquiryCount = pkg.crmEnquiries.length;
      const regularConfirmed = pkg.tours.filter((t: any) => ['Confirmed', 'CONFIRMED', 'Completed', 'COMPLETED', 'Ongoing', 'ONGOING'].includes(t.status)).length;
      
      let gtConfirmedBookingsCount = 0;
      let gtRevenue = 0;
      pkg.groupTours.forEach((gt: any) => {
        const price = Number(gt.pricePerPerson || 0);
        const confirmedB = gt.bookings || [];
        gtConfirmedBookingsCount += confirmedB.length;
        confirmedB.forEach((b: any) => {
          gtRevenue += (b.numberOfPeople * price);
        });
      });

      const totalBookings = pkg.tours.length + gtConfirmedBookingsCount;
      const confirmedBookings = regularConfirmed + gtConfirmedBookingsCount;
      const revenue = (regularConfirmed * (pkg.basePrice || 49999)) + gtRevenue;
      const pkgConversionRate = enquiryCount > 0 ? Number(((confirmedBookings / enquiryCount) * 100).toFixed(1)) : 0;

      return {
        id: pkg.id,
        title: pkg.title,
        destination: pkg.destination?.name || 'Sri Lanka',
        enquiryCount,
        bookingCount: totalBookings,
        confirmedBookings,
        revenue,
        conversionRate: pkgConversionRate
      };
    });

    // 7. Sales by Destination Table
    const destinations = await prisma.destination.findMany();
    const salesByDestination = await Promise.all(destinations.map(async (dest: any) => {
      const destEnquiries = await prisma.enquiry.count({
        where: { createdAt: { gte, lte }, destination: dest.name }
      });
      const destTours = await prisma.tour.count({
        where: { createdAt: { gte, lte }, destination: dest.name }
      });
      const destConfirmed = await prisma.tour.count({
        where: { createdAt: { gte, lte }, destination: dest.name, status: { in: ['Confirmed', 'CONFIRMED', 'Completed', 'COMPLETED', 'Ongoing', 'ONGOING'] } }
      });

      const gtBookings = await prisma.groupTourBooking.findMany({
        where: {
          createdAt: { gte, lte },
          status: 'CONFIRMED',
          groupTour: { destination: { contains: dest.name, mode: 'insensitive' } }
        },
        include: { groupTour: true }
      });

      const destGtConfirmedCount = gtBookings.length;
      const destGtRevenue = gtBookings.reduce((sum, b) => sum + (b.numberOfPeople * Number(b.groupTour.pricePerPerson || 0)), 0);

      const totalBookings = destTours + destGtConfirmedCount;
      const confirmedBookings = destConfirmed + destGtConfirmedCount;
      const revenue = (destConfirmed * 59999) + destGtRevenue;
      const destConversionRate = destEnquiries > 0 ? Number(((confirmedBookings / destEnquiries) * 100).toFixed(1)) : 0;

      return {
        id: dest.id,
        name: dest.name,
        enquiryCount: destEnquiries,
        bookingCount: totalBookings,
        confirmedBookings,
        revenue,
        conversionRate: destConversionRate
      };
    }));

    // 8. Follow-up Performance Card (Must count ONLY valid Enquiry-linked follow-ups)
    const validEnquiryFollowUpWhere: any = {
      status: { notIn: ['CANCELLED', 'DELETED'] },
      enquiryId: { not: null },
      enquiry: { isNot: null }
    };

    if (gte && lte) {
      validEnquiryFollowUpWhere.AND = [
        {
          OR: [
            { scheduledFor: { gte, lte } },
            { createdAt: { gte, lte } }
          ]
        }
      ];
    }

    const totalFollowUps = await prisma.followUp.count({ where: validEnquiryFollowUpWhere });
    const completedFollowUps = await prisma.followUp.count({
      where: { ...validEnquiryFollowUpWhere, status: 'COMPLETED' }
    });
    const pendingFollowUps = await prisma.followUp.count({
      where: { ...validEnquiryFollowUpWhere, status: { in: ['PENDING', 'SCHEDULED'] } }
    });
    const overdueFollowUps = await prisma.followUp.count({
      where: { ...validEnquiryFollowUpWhere, status: 'PENDING', scheduledFor: { lt: now } }
    });
    const followUpCompletionRate = totalFollowUps > 0 ? Number(((completedFollowUps / totalFollowUps) * 100).toFixed(1)) : 0;

    // 9. Lost Lead Analysis
    const totalLostLeads = await prisma.enquiry.count({
      where: { ...enquiryWhere, status: { in: ['LOST', 'CANCELLED'] } }
    });
    const lostLeadPercentage = totalEnquiries > 0 ? Number(((totalLostLeads / totalEnquiries) * 100).toFixed(1)) : 0;

    const lostBySourceGroups = await prisma.enquiry.groupBy({
      by: ['source'],
      _count: { id: true },
      where: { ...enquiryWhere, status: { in: ['LOST', 'CANCELLED'] } }
    });
    const lostBySource = lostBySourceGroups.map((g: any) => ({
      source: g.source ? g.source.replace(/_/g, ' ') : 'Direct',
      count: g._count.id
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalEnquiries,
          convertedEnquiries,
          conversionRate,
          totalQuotations,
          acceptedQuotations,
          rejectedQuotations,
          expiredQuotations,
          pendingQuotations,
        },
        funnel,
        sourceDistribution,
        timelineData,
        salespersonPerformance,
        salesByPackage,
        salesByDestination,
        followUpPerformance: {
          totalFollowUps,
          completedFollowUps,
          pendingFollowUps,
          overdueFollowUps,
          completionRate: followUpCompletionRate
        },
        lostLeadAnalysis: {
          totalLostLeads,
          lostLeadPercentage,
          lostBySource,
          reasonNote: "Lost reason data not available"
        }
      }
    });
  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sales analytics' });
  }
};

// 3. PACKAGE ANALYTICS (EXTENDED & PROFITABILITY ACCURATE)
export const getPackageAnalytics = async (req: Request, res: Response) => {
  try {
    const { gte, lte } = parseFilterDates(req);

    // Query Filters
    const packageFilterId = req.query.packageId as string | undefined;
    const destinationFilter = req.query.destination as string | undefined;
    const sourceFilter = req.query.source as string | undefined;

    const packageWhere: any = {};
    if (packageFilterId) packageWhere.id = packageFilterId;
    if (destinationFilter) packageWhere.destination = { name: destinationFilter };

    const packages = await prisma.travelPackage.findMany({
      where: packageWhere,
      include: {
        crmEnquiries: {
          where: {
            createdAt: { gte, lte },
            ...(sourceFilter ? { source: sourceFilter } : {})
          }
        },
        tours: {
          where: { createdAt: { gte, lte } }
        },
        groupTours: {
          where: { createdAt: { gte, lte } },
          include: { bookings: { where: { status: 'CONFIRMED' } } }
        },
        destination: { select: { name: true } }
      }
    });

    let totalPackageEnquiries = 0;
    let totalPackageBookings = 0;
    let totalPackageRevenue = 0;

    const packagePerformance = await Promise.all(packages.map(async (pkg: any) => {
      const enquiryCount = pkg.crmEnquiries.length;
      const regularConfirmedCount = pkg.tours.filter((t: any) =>
        ['Confirmed', 'CONFIRMED', 'Completed', 'COMPLETED', 'Ongoing', 'ONGOING'].includes(t.status)
      ).length;

      let gtConfirmedCount = 0;
      let gtRevenue = 0;
      pkg.groupTours.forEach((gt: any) => {
        const price = Number(gt.pricePerPerson || 0);
        const bookings = gt.bookings || [];
        gtConfirmedCount += bookings.length;
        bookings.forEach((b: any) => {
          gtRevenue += (b.numberOfPeople * price);
        });
      });

      const totalBookings = pkg.tours.length + gtConfirmedCount;
      const confirmedBookings = regularConfirmedCount + gtConfirmedCount;
      const revenue = (regularConfirmedCount * (pkg.basePrice || 49999)) + gtRevenue;
      const avgBookingValue = confirmedBookings > 0 ? Math.round(revenue / confirmedBookings) : null;
      const conversionRate = enquiryCount > 0 ? Number(((confirmedBookings / enquiryCount) * 100).toFixed(1)) : null;

      // Query Operational Costs for tours belonging to this package
      const opsCostAgg = await prisma.operationalCost.aggregate({
        _sum: { actualCost: true },
        where: {
          tour: { packageId: pkg.id },
          costDate: { gte, lte }
        }
      });

      const hasCostData = opsCostAgg._sum.actualCost !== null && Number(opsCostAgg._sum.actualCost) > 0;
      const cost = hasCostData ? Number(opsCostAgg._sum.actualCost) : null;
      const profit = hasCostData && cost !== null ? revenue - cost : null;
      const margin = hasCostData && profit !== null && revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : null;

      totalPackageEnquiries += enquiryCount;
      totalPackageBookings += confirmedBookings;
      totalPackageRevenue += revenue;

      return {
        id: pkg.id,
        title: pkg.title,
        slug: pkg.slug,
        destination: pkg.destination?.name || 'Sri Lanka',
        basePrice: pkg.basePrice || 0,
        enquiryCount,
        bookingCount: totalBookings,
        confirmedBookings,
        revenue,
        avgBookingValue,
        conversionRate,
        cost,
        profit,
        margin
      };
    }));

    // Summary Cards Calculations
    const totalPackages = packagePerformance.length;
    const overallAvgBookingValue = totalPackageBookings > 0 ? Math.round(totalPackageRevenue / totalPackageBookings) : null;
    const overallConversionRate = totalPackageEnquiries > 0 ? Number(((totalPackageBookings / totalPackageEnquiries) * 100).toFixed(1)) : null;

    // Top Rankings
    const mostEnquired = [...packagePerformance].sort((a, b) => b.enquiryCount - a.enquiryCount).slice(0, 3);
    const mostBooked = [...packagePerformance].sort((a, b) => b.confirmedBookings - a.confirmedBookings).slice(0, 3);
    const highestRevenue = [...packagePerformance].sort((a, b) => b.revenue - a.revenue).slice(0, 3);
    const highestConversion = [...packagePerformance]
      .filter(p => p.conversionRate !== null)
      .sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))
      .slice(0, 3);

    // Destination Performance Grouping
    const destMap: Record<string, { destination: string; enquiryCount: number; bookingCount: number; confirmedBookings: number; revenue: number }> = {};
    packagePerformance.forEach(p => {
      const dName = p.destination;
      if (!destMap[dName]) {
        destMap[dName] = { destination: dName, enquiryCount: 0, bookingCount: 0, confirmedBookings: 0, revenue: 0 };
      }
      destMap[dName].enquiryCount += p.enquiryCount;
      destMap[dName].bookingCount += p.bookingCount;
      destMap[dName].confirmedBookings += p.confirmedBookings;
      destMap[dName].revenue += p.revenue;
    });

    const destinationPerformance = Object.values(destMap).map(d => ({
      ...d,
      conversionRate: d.enquiryCount > 0 ? Number(((d.confirmedBookings / d.enquiryCount) * 100).toFixed(1)) : null
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalPackages,
          totalPackageEnquiries,
          totalPackageBookings,
          totalPackageRevenue,
          avgBookingValue: overallAvgBookingValue,
          overallConversionRate
        },
        packagePerformance,
        topRankings: {
          mostEnquired,
          mostBooked,
          highestRevenue,
          highestConversion
        },
        destinationPerformance,
        viewTrackingAvailable: false,
        viewTrackingNote: "View tracking unavailable"
      }
    });
  } catch (error) {
    console.error('Package analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch package analytics' });
  }
};

// 4. FINANCIAL ANALYTICS
export const getFinancialAnalytics = async (req: Request, res: Response) => {
  try {
    const { gte, lte } = parseFilterDates(req);
    const now = new Date();

    // 1. REVENUE AND EXPENSE CALCULATIONS (Single Source of Truth)
    const pnl = await generatePnLStatement({ startDate: gte, endDate: lte });

    const gtBookings = await prisma.groupTourBooking.findMany({
      where: { createdAt: { gte, lte }, status: 'CONFIRMED' },
      include: { groupTour: true }
    });
    
    const totalRevenue = pnl.revenue.total;
    const totalExpense = pnl.expenses.total;
    const netProfit = pnl.profitability.netProfit;

    // 3. REFUNDS & PENDING PAYMENTS
    const refundsTransAgg = await prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'REFUND', date: { gte, lte }, status: 'COMPLETED' }
    });
    const refundAmount = refundsTransAgg._sum.amount || 0;

    const pendingIncomeAgg = await prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'INCOME', status: 'PENDING', date: { gte, lte } }
    });
    const pendingPayments = pendingIncomeAgg._sum.amount || 0;

    // 4. OUTSTANDING BALANCE (from APPROVED Bookings matching Accounting module)
    const activeBookingsForOutstanding = await prisma.bookingPreparation.findMany({
      where: {
        status: { not: 'CANCELLED' },
        createdAt: { gte, lte }
      },
      include: {
        quotation: {
          include: { payments: { include: { transaction: true } } }
        },
        payments: { include: { transaction: true } }
      }
    });

    let outstandingPayments = 0;
    activeBookingsForOutstanding.forEach(b => {
      const allPayments = [
        ...(b.payments || []),
        ...(b.quotation?.payments || [])
      ];
      
      // Deduplicate payments to prevent duplicate counting
      const uniquePaymentsMap = new Map();
      allPayments.forEach(p => {
        if (p.transaction?.status === 'COMPLETED') {
          uniquePaymentsMap.set(p.id, p.transaction.amount);
        }
      });
      
      let paid = 0;
      uniquePaymentsMap.forEach(amount => { paid += amount; });
      
      // Only consider active bookings that have received a valid payment
      if (paid > 0) {
        const totalAmount = b.quotation?.basePrice || b.taxableAmount || 0;
        const remaining = totalAmount - paid;
        if (remaining > 0) outstandingPayments += remaining;
      }
    });

    // 5. ADVANCE PAYMENTS
    const advancePaymentsList = await prisma.customerPayment.findMany({
      where: {
        paymentType: 'ADVANCE',
        transaction: { date: { gte, lte }, status: 'COMPLETED' }
      },
      include: { transaction: true }
    });
    const advancePayments = advancePaymentsList.reduce((sum, cp) => sum + (cp.transaction?.amount || 0), 0);

    // 6. GST ANALYTICS (Only from REAL collected payments, not unpaid quotations)
    const gstRecordsAgg = await prisma.gSTRecord.aggregate({
      _sum: { totalGst: true },
      where: { transaction: { date: { gte, lte } } }
    });
    
    let gstCollected = gstRecordsAgg._sum.totalGst || 0;
    
    // Fallback: If no explicit GSTRecords exist, estimate 5% from actual collected payments (INCOME FinancialTransactions)
    // that are marked as GST_INCLUDED in their associated RevenueRecords.
    if (gstCollected === 0) {
      const gstTransactions = await prisma.financialTransaction.findMany({
        where: {
          date: { gte, lte },
          type: 'INCOME',
          status: 'COMPLETED',
          customerPayment: {
            revenueRecord: { gstStatus: 'GST_INCLUDED' }
          }
        },
        select: { amount: true }
      });
      const taxableCollectedAmount = gstTransactions.reduce((sum, t) => sum + t.amount, 0);
      gstCollected = taxableCollectedAmount * 0.05;
    }

    const expenseTaxAgg = await prisma.expense.aggregate({
      _sum: { totalTaxAmount: true },
      where: { expenseDate: { gte, lte }, status: { notIn: ['CANCELLED', 'REJECTED'] } }
    });
    const gstAdjustments = expenseTaxAgg._sum.totalTaxAmount || 0;
    const netGst = Number((gstCollected - gstAdjustments).toFixed(2));

    // 7. REAL MONTHLY TREND & PROFIT TREND (Dynamic Real-DB Month Grouping)
    const monthMap: Record<string, { revenue: number; expenses: number; profit: number }> = {};
    
    const startYear = gte.getFullYear();
    const endYear = lte.getFullYear();
    const startMonth = gte.getMonth();
    const endMonth = lte.getMonth();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let curYear = startYear;
    let curMonth = startMonth;
    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      const key = `${monthNames[curMonth]} ${curYear !== now.getFullYear() ? curYear : ''}`.trim();
      monthMap[key] = { revenue: 0, expenses: 0, profit: 0 };
      curMonth++;
      if (curMonth > 11) {
        curMonth = 0;
        curYear++;
      }
    }

    const revRecords = await prisma.revenueRecord.findMany({
      where: { date: { gte, lte } },
      select: { amount: true, date: true }
    });
    const incTransactions = await prisma.financialTransaction.findMany({
      where: { date: { gte, lte }, type: 'INCOME', status: 'COMPLETED' },
      select: { amount: true, date: true }
    });
    [...revRecords, ...incTransactions].forEach(r => {
      const key = `${monthNames[r.date.getMonth()]} ${r.date.getFullYear() !== now.getFullYear() ? r.date.getFullYear() : ''}`.trim();
      if (monthMap[key]) {
        monthMap[key].revenue += r.amount;
      }
    });

    gtBookings.forEach(b => {
      const key = `${monthNames[b.createdAt.getMonth()]} ${b.createdAt.getFullYear() !== now.getFullYear() ? b.createdAt.getFullYear() : ''}`.trim();
      if (monthMap[key]) {
        const price = Number(b.groupTour.pricePerPerson || 0);
        monthMap[key].revenue += (b.numberOfPeople * price);
      }
    });

    const expRecords = await prisma.expense.findMany({
      where: { expenseDate: { gte, lte }, status: { notIn: ['CANCELLED', 'REJECTED'] } },
      select: { totalAmount: true, expenseDate: true }
    });

    expRecords.forEach(e => {
      const key = `${monthNames[e.expenseDate.getMonth()]} ${e.expenseDate.getFullYear() !== now.getFullYear() ? e.expenseDate.getFullYear() : ''}`.trim();
      if (monthMap[key]) monthMap[key].expenses += e.totalAmount;
    });

    const monthlyTrend = Object.keys(monthMap).map(key => {
      const rev = Number(monthMap[key].revenue.toFixed(2));
      const exp = Number(monthMap[key].expenses.toFixed(2));
      const prof = Number((rev - exp).toFixed(2));
      return {
        month: key,
        revenue: rev,
        expenses: exp,
        profit: prof
      };
    });

    const hasFinancialRecords = totalRevenue > 0 || totalExpense > 0 || outstandingPayments > 0 || refundAmount > 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalExpense,
          netProfit,
          gstCollected,
          outstandingPayments,
          refundAmount,
          hasFinancialRecords
        },
        paymentCollection: {
          totalCollected: totalRevenue,
          pendingPayments,
          outstandingBalance: outstandingPayments,
          advancePayments,
          refunds: refundAmount
        },
        pnlSummary: {
          revenue: totalRevenue,
          expenses: totalExpense,
          netProfit,
          gstCollected,
          refunds: refundAmount,
          outstandingAmount: outstandingPayments
        },
        gstAnalytics: {
          gstCollected,
          gstAdjustments,
          netGst,
          hasGstData: gstCollected > 0 || gstAdjustments > 0
        },
        monthlyTrend
      }
    });
  } catch (error) {
    console.error('Financial analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch financial analytics' });
  }
};

// 5. EMPLOYEE ANALYTICS
export const getEmployeeAnalytics = async (req: Request, res: Response) => {
  try {
    const { gte, lte } = parseFilterDates(req);
    const departmentFilter = req.query.departmentId as string | undefined;

    // 1. EMPLOYEE SUMMARY KPI CARDS
    const totalEmployees = await prisma.employee.count();
    const activeEmployees = await prisma.employee.count({ where: { status: 'ACTIVE' } });
    const inactiveEmployees = await prisma.employee.count({
      where: { status: { not: 'ACTIVE' } }
    });

    // 2. DEPARTMENT-WISE DISTRIBUTION
    const departments = await prisma.department.findMany({
      include: {
        employees: {
          select: { id: true, status: true }
        }
      }
    });

    const departmentDistribution = departments.map((dept: any) => ({
      id: dept.id,
      name: dept.name,
      totalCount: dept.employees.length,
      activeCount: dept.employees.filter((e: any) => e.status === 'ACTIVE').length
    }));

    const noDeptEmployees = await prisma.employee.count({
      where: { departmentId: null }
    });
    if (noDeptEmployees > 0) {
      departmentDistribution.push({
        id: 'unassigned',
        name: 'Unassigned / Direct',
        totalCount: noDeptEmployees,
        activeCount: await prisma.employee.count({ where: { departmentId: null, status: 'ACTIVE' } })
      });
    }

    // 3. EMPLOYEE PERFORMANCE LEADERBOARD & SALES ACTIVITY
    const employeeWhere: any = { status: { not: 'DELETED' } };
    if (departmentFilter) employeeWhere.departmentId = departmentFilter;

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        salaries: {
          where: { createdAt: { gte, lte } }
        },
        incentives: {
          where: { createdAt: { gte, lte } }
        },
        bonuses: {
          where: { createdAt: { gte, lte } }
        }
      }
    });

    const performance = await Promise.all(employees.map(async (emp: any) => {
      // 1. Enquiries Handled (Assigned directly via EnquiryAssignment or via SalesLead)
      const assignedEnquiries = await prisma.enquiry.findMany({
        where: {
          createdAt: { gte, lte },
          OR: [
            { assignments: { some: { employeeId: emp.id } } },
            { salesLead: { assignedToId: emp.id } }
          ]
        },
        select: { id: true }
      });
      const enquiriesHandled = assignedEnquiries.length;

      // 2. Follow-ups Count (Total actual follow-up records associated with this employee)
      const followUpWhere: any = {
        status: { notIn: ['CANCELLED', 'DELETED'] },
        employeeId: emp.id
      };
      if (gte && lte) {
        followUpWhere.AND = [
          {
            OR: [
              { scheduledFor: { gte, lte } },
              { createdAt: { gte, lte } }
            ]
          }
        ];
      }

      const rawFollowUps = await prisma.followUp.findMany({ where: followUpWhere });
      // Deduplicate strictly by primary key ID (single source of truth)
      const followUpMap = new Map<string, any>();
      rawFollowUps.forEach((f: any) => followUpMap.set(f.id, f));
      const followUps = Array.from(followUpMap.values());

      const followUpsCount = followUps.length;
      const followUpsCompleted = followUps.filter(f => f.status === 'COMPLETED').length;
      const followUpsPending = followUps.filter(f => f.status === 'PENDING' || f.status === 'SCHEDULED').length;

      // 3. Quotations Created / Attributable
      const quotations = await prisma.quotation.findMany({
        where: {
          createdAt: { gte, lte },
          OR: [
            { salesLead: { assignedToId: emp.id } },
            { salesLead: { enquiry: { assignments: { some: { employeeId: emp.id } } } } }
          ]
        }
      });
      const quotationsCreated = quotations.length;

      // 4. Confirmed Bookings & Group Tours Attributable
      const tours = await prisma.tour.findMany({
        where: {
          createdAt: { gte, lte },
          status: { in: ['Confirmed', 'CONFIRMED', 'Completed', 'COMPLETED', 'Ongoing', 'ONGOING'] },
          OR: [
            { coordinatorId: emp.id },
            { quotation: { salesLead: { assignedToId: emp.id } } },
            { bookingPrep: { quotation: { salesLead: { assignedToId: emp.id } } } }
          ]
        }
      });

      const empGroupTours = await prisma.groupTour.findMany({
        where: {
          createdById: emp.id,
          createdAt: { gte, lte }
        },
        include: {
          bookings: {
            where: { status: 'CONFIRMED' }
          }
        }
      });

      const empGtBookingsCount = empGroupTours.reduce((sum, gt) => sum + gt.bookings.length, 0);
      const empGtRevenue = empGroupTours.reduce((sum, gt) => {
        const price = Number(gt.pricePerPerson || 0);
        const bookedSlots = gt.bookings.reduce((bSum, b) => bSum + b.numberOfPeople, 0);
        return sum + (bookedSlots * price);
      }, 0);

      const confirmedBookings = tours.length + empGtBookingsCount;

      // 5. Revenue Generated (Real DB Completed Transactions, Revenue Records & Group Tours)
      const revenueRecords = await prisma.revenueRecord.findMany({
        where: {
          date: { gte, lte },
          OR: [
            { createdById: emp.id },
            { quotation: { salesLead: { assignedToId: emp.id } } }
          ]
        }
      });
      const revRecordSum = revenueRecords.reduce((sum, r) => sum + r.amount, 0);

      const completedIncomeTrans = await prisma.financialTransaction.findMany({
        where: {
          date: { gte, lte },
          type: 'INCOME',
          status: 'COMPLETED',
          OR: [
            { createdById: emp.id },
            { customerPayment: { quotation: { salesLead: { assignedToId: emp.id } } } }
          ]
        }
      });
      const transSum = completedIncomeTrans.reduce((sum, t) => sum + t.amount, 0);

      const revenueGenerated = Math.max(revRecordSum, transSum) + empGtRevenue;

      // 6. Conversion Rate (Confirmed Bookings / Enquiries Handled)
      const conversionRate = enquiriesHandled > 0 ? Number(((confirmedBookings / enquiriesHandled) * 100).toFixed(1)) : 0;

      // 7. Payroll Details for this employee
      const totalSalaryPaid = emp.salaries
        ? emp.salaries.filter((s: any) => s.status === 'PAID').reduce((sum: number, s: any) => sum + s.netSalary, 0)
        : 0;
      const totalIncentiveAmount = emp.incentives
        ? emp.incentives.reduce((sum: number, i: any) => sum + i.amount, 0)
        : 0;
      const totalBonusAmount = emp.bonuses
        ? emp.bonuses.reduce((sum: number, b: any) => sum + b.amount, 0)
        : 0;

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        status: emp.status,
        department: emp.department?.name || 'Unassigned',
        designation: emp.designation?.name || 'Staff',
        enquiriesHandled,
        followUpsCount,
        followUpsCompleted,
        followUpsPending,
        quotationsCreated,
        confirmedBookings,
        leadsConverted: confirmedBookings,
        toursCoordinated: tours.length + empGroupTours.length,
        conversionRate,
        revenueGenerated,
        totalSalaryPaid: totalSalaryPaid > 0 ? totalSalaryPaid : null,
        totalIncentives: totalIncentiveAmount > 0 ? totalIncentiveAmount : null,
        totalBonuses: totalBonusAmount > 0 ? totalBonusAmount : null
      };
    }));

    // 4. PAYROLL SUMMARY
    const salaryWhere: any = { createdAt: { gte, lte } };
    const paidSalariesAgg = await prisma.salaryRecord.aggregate({
      _sum: { netSalary: true },
      _count: { id: true },
      where: { ...salaryWhere, status: 'PAID' }
    });

    const totalPayroll = paidSalariesAgg._sum.netSalary || 0;
    const paidSalaryCount = paidSalariesAgg._count.id || 0;
    const averageSalary = paidSalaryCount > 0 ? Number((totalPayroll / paidSalaryCount).toFixed(2)) : null;

    const incentivesAgg = await prisma.employeeIncentive.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { createdAt: { gte, lte } }
    });
    const totalIncentives = incentivesAgg._sum.amount !== null && incentivesAgg._count.id > 0
      ? incentivesAgg._sum.amount
      : null;

    const bonusesAgg = await prisma.employeeBonus.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: { createdAt: { gte, lte } }
    });
    const totalBonuses = bonusesAgg._sum.amount !== null && bonusesAgg._count.id > 0
      ? bonusesAgg._sum.amount
      : null;

    const hasPayrollData = totalPayroll > 0 || (totalIncentives !== null && totalIncentives > 0) || (totalBonuses !== null && totalBonuses > 0);

    // 5. MONTHLY PAYROLL TREND
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const startYear = gte.getFullYear();
    const endYear = lte.getFullYear();
    const startMonth = gte.getMonth();
    const endMonth = lte.getMonth();

    const monthMap: Record<string, { payroll: number; incentives: number; bonuses: number }> = {};
    let curYear = startYear;
    let curMonth = startMonth;
    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      const key = `${monthNames[curMonth]} ${curYear !== now.getFullYear() ? curYear : ''}`.trim();
      monthMap[key] = { payroll: 0, incentives: 0, bonuses: 0 };
      curMonth++;
      if (curMonth > 11) {
        curMonth = 0;
        curYear++;
      }
    }

    const salRecords = await prisma.salaryRecord.findMany({
      where: { createdAt: { gte, lte }, status: 'PAID' },
      select: { netSalary: true, createdAt: true }
    });
    const incRecords = await prisma.employeeIncentive.findMany({
      where: { createdAt: { gte, lte } },
      select: { amount: true, createdAt: true }
    });
    const bonRecords = await prisma.employeeBonus.findMany({
      where: { createdAt: { gte, lte } },
      select: { amount: true, createdAt: true }
    });

    salRecords.forEach(s => {
      const key = `${monthNames[s.createdAt.getMonth()]} ${s.createdAt.getFullYear() !== now.getFullYear() ? s.createdAt.getFullYear() : ''}`.trim();
      if (monthMap[key]) monthMap[key].payroll += s.netSalary;
    });
    incRecords.forEach(i => {
      const key = `${monthNames[i.createdAt.getMonth()]} ${i.createdAt.getFullYear() !== now.getFullYear() ? i.createdAt.getFullYear() : ''}`.trim();
      if (monthMap[key]) monthMap[key].incentives += i.amount;
    });
    bonRecords.forEach(b => {
      const key = `${monthNames[b.createdAt.getMonth()]} ${b.createdAt.getFullYear() !== now.getFullYear() ? b.createdAt.getFullYear() : ''}`.trim();
      if (monthMap[key]) monthMap[key].bonuses += b.amount;
    });

    const monthlyPayrollTrend = Object.keys(monthMap).map(key => ({
      month: key,
      payroll: Number(monthMap[key].payroll.toFixed(2)),
      incentives: Number(monthMap[key].incentives.toFixed(2)),
      bonuses: Number(monthMap[key].bonuses.toFixed(2))
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalEmployees,
          activeEmployees,
          inactiveEmployees,
        },
        departmentDistribution,
        performance,
        payrollSummary: {
          totalPayroll: hasPayrollData ? totalPayroll : null,
          averageSalary,
          totalIncentives,
          totalBonuses,
          hasPayrollData
        },
        monthlyPayrollTrend
      }
    });
  } catch (error) {
    console.error('Employee analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employee analytics' });
  }
};

// 6. OPERATIONS ANALYTICS
export const getOperationsAnalytics = async (req: Request, res: Response) => {
  try {
    const { gte, lte } = parseFilterDates(req);

    // Operational Filters
    const destination = req.query.destination as string | undefined;
    const coordinatorId = req.query.coordinatorId as string | undefined;
    const status = (req.query.status || req.query.tourStatus) as string | undefined;

    // Group Tour specific filters
    const groupTourId = req.query.groupTourId as string | undefined;
    const groupTourStatus = req.query.groupTourStatus as string | undefined;

    // Tour Base Filter (Regular Tours)
    const tourWhere: any = {};
    if (destination) tourWhere.destination = destination;
    if (coordinatorId) tourWhere.coordinatorId = coordinatorId;
    if (status && status !== 'ALL') tourWhere.status = status;

    if (gte && lte) {
      tourWhere.OR = [
        { startDate: { gte, lte } },
        { createdAt: { gte, lte } }
      ];
    }

    // 1. REGULAR TOUR STATUS METRICS
    const upcomingToursCount = await prisma.tour.count({
      where: { ...tourWhere, status: { in: ['Upcoming', 'Preparation', 'Confirmed'] } }
    });
    const ongoingToursCount = await prisma.tour.count({
      where: { ...tourWhere, status: { in: ['Ongoing', 'ONGOING'] } }
    });
    const completedToursCount = await prisma.tour.count({
      where: { ...tourWhere, status: { in: ['Completed', 'COMPLETED'] } }
    });
    const cancelledToursCount = await prisma.tour.count({
      where: { ...tourWhere, status: { in: ['Cancelled', 'CANCELLED'] } }
    });

    const totalTours = upcomingToursCount + ongoingToursCount + completedToursCount + cancelledToursCount;

    // 2. OPERATIONAL TASK & RESERVATION METRICS
    const pendingTasksCount = await prisma.operationalTask.count({
      where: {
        tour: tourWhere,
        status: { in: ['Pending', 'In Progress', 'PENDING', 'IN_PROGRESS'] }
      }
    });

    const pendingFlightTicketsCount = await prisma.flightTicket.count({
      where: {
        tour: tourWhere,
        ticketStatus: { in: ['Requested', 'Processing', 'PENDING'] }
      }
    });
    const pendingTrainTicketsCount = await prisma.trainTicket.count({
      where: {
        tour: tourWhere,
        ticketStatus: { in: ['Requested', 'Processing', 'PENDING'] }
      }
    });
    const pendingBusTicketsCount = await prisma.busTicket.count({
      where: {
        tour: tourWhere,
        ticketStatus: { in: ['Requested', 'Processing', 'PENDING'] }
      }
    });
    const pendingTicketBookings = pendingFlightTicketsCount + pendingTrainTicketsCount + pendingBusTicketsCount;

    const pendingHotelReservations = await prisma.hotelReservation.count({
      where: {
        tour: tourWhere,
        reservationStatus: { in: ['Requested', 'Pending', 'PENDING'] }
      }
    });

    const pendingTransportReservations = await prisma.transportReservation.count({
      where: {
        tour: tourWhere,
        reservationStatus: { in: ['Requested', 'Pending', 'PENDING'] }
      }
    });

    const missingCustomerDocuments = await prisma.operationsDocument.count({
      where: {
        tour: tourWhere,
        verificationStatus: { in: ['Pending', 'Rejected', 'Expired', 'PENDING'] }
      }
    });

    // 3. GROUP TOUR MANAGEMENT ANALYTICS
    const groupTourWhere: any = {};
    if (destination) groupTourWhere.destination = destination;
    if (groupTourId) groupTourWhere.id = groupTourId;
    if (groupTourStatus && groupTourStatus !== 'ALL') groupTourWhere.status = groupTourStatus;

    if (gte && lte) {
      groupTourWhere.OR = [
        { startDate: { gte, lte } },
        { createdAt: { gte, lte } }
      ];
    }

    const groupTours = await prisma.groupTour.findMany({
      where: groupTourWhere,
      include: {
        bookings: {
          where: { status: 'CONFIRMED' },
          select: { numberOfPeople: true }
        },
        createdBy: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    const now = new Date();
    let upcomingGroupDepartures = 0;
    let ongoingGroupDepartures = 0;
    let completedGroupDepartures = 0;
    let cancelledGroupDepartures = 0;
    let fullyBookedGroupTours = 0;
    let partiallyAvailableGroupTours = 0;
    let totalCapacity = 0;
    let totalBookedSeats = 0;
    let totalAvailableSeats = 0;
    let totalEstimatedRevenue = 0;

    const groupTourItems = groupTours.map(gt => {
      const bookedSlots = gt.bookings.reduce((sum, b) => sum + b.numberOfPeople, 0);
      const availableSlots = Math.max(0, gt.totalSlots - bookedSlots);
      const price = Number(gt.pricePerPerson || 0);

      const startDate = new Date(gt.startDate);
      const endDate = new Date(gt.endDate);

      let calculatedStatus = gt.status;
      if (gt.status === 'Cancelled' || gt.status === 'CANCELLED') {
        cancelledGroupDepartures++;
        calculatedStatus = 'Cancelled';
      } else if (gt.status === 'Completed' || endDate < now) {
        completedGroupDepartures++;
        calculatedStatus = 'Completed';
      } else if (startDate <= now && endDate >= now) {
        ongoingGroupDepartures++;
        if (availableSlots === 0) calculatedStatus = 'Full';
        else if (availableSlots <= 3) calculatedStatus = 'Almost Full';
        else calculatedStatus = 'Open';
      } else {
        upcomingGroupDepartures++;
        if (availableSlots === 0) calculatedStatus = 'Full';
        else if (availableSlots <= 3) calculatedStatus = 'Almost Full';
        else calculatedStatus = 'Open';
      }

      if (availableSlots === 0 && calculatedStatus !== 'Cancelled') {
        fullyBookedGroupTours++;
      } else if (availableSlots > 0 && calculatedStatus !== 'Cancelled' && calculatedStatus !== 'Completed') {
        partiallyAvailableGroupTours++;
      }

      totalCapacity += gt.totalSlots;
      totalBookedSeats += bookedSlots;
      totalAvailableSeats += availableSlots;
      totalEstimatedRevenue += bookedSlots * price;

      return {
        id: gt.id,
        groupTourRef: gt.groupTourRef,
        title: gt.title,
        destination: gt.destination,
        startDate: gt.startDate,
        endDate: gt.endDate,
        totalSlots: gt.totalSlots,
        bookedSlots,
        availableSlots,
        pricePerPerson: price,
        estimatedRevenue: bookedSlots * price,
        status: calculatedStatus,
        coordinatorName: gt.createdBy ? `${gt.createdBy.firstName} ${gt.createdBy.lastName}` : null
      };
    });

    // Group Tour Destination Demand Breakdown
    const destMap = new Map<string, { destination: string; departuresCount: number; capacity: number; booked: number; available: number; revenue: number }>();
    groupTours.forEach(gt => {
      const dest = gt.destination || 'Unspecified';
      const bookedSlots = gt.bookings.reduce((sum, b) => sum + b.numberOfPeople, 0);
      const availableSlots = Math.max(0, gt.totalSlots - bookedSlots);
      const price = Number(gt.pricePerPerson || 0);

      const existing = destMap.get(dest) || {
        destination: dest,
        departuresCount: 0,
        capacity: 0,
        booked: 0,
        available: 0,
        revenue: 0
      };

      existing.departuresCount += 1;
      existing.capacity += gt.totalSlots;
      existing.booked += bookedSlots;
      existing.available += availableSlots;
      existing.revenue += bookedSlots * price;

      destMap.set(dest, existing);
    });

    const groupTourDestinationDemand = Array.from(destMap.values()).sort((a, b) => b.booked - a.booked);

    // 4. COORDINATOR WORKLOAD METRICS (REGULAR + GROUP TOURS)
    const coordinatorsList = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { toursCoordinated: { some: {} } },
          { createdGroupTours: { some: {} } },
          { department: { name: { contains: 'Operation', mode: 'insensitive' } } },
          { designation: { name: { contains: 'Coordinator', mode: 'insensitive' } } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        toursCoordinated: {
          where: destination ? { destination } : {},
          select: {
            id: true,
            status: true,
            checklistTasks: {
              where: { status: { in: ['Pending', 'In Progress', 'PENDING', 'IN_PROGRESS'] } },
              select: { id: true }
            }
          }
        },
        createdGroupTours: {
          where: destination ? { destination } : {},
          select: {
            id: true,
            status: true
          }
        },
        assignedOperationalTasks: {
          where: { status: { in: ['Pending', 'In Progress', 'PENDING', 'IN_PROGRESS'] } },
          select: { id: true }
        }
      }
    });

    const coordinatorWorkload = coordinatorsList.map(emp => {
      const regularTours = emp.toursCoordinated.length;
      const groupToursCount = emp.createdGroupTours.length;
      const assignedTours = regularTours + groupToursCount;

      const upcomingTours = emp.toursCoordinated.filter(t => ['Upcoming', 'Preparation', 'Confirmed'].includes(t.status)).length;
      const ongoingTours = emp.toursCoordinated.filter(t => ['Ongoing', 'ONGOING'].includes(t.status)).length;
      const completedTours = emp.toursCoordinated.filter(t => ['Completed', 'COMPLETED'].includes(t.status)).length;

      const tasksOnTours = emp.toursCoordinated.reduce((sum, t) => sum + t.checklistTasks.length, 0);
      const pendingAssignedTasks = emp.assignedOperationalTasks.length;

      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        regularToursAssigned: regularTours,
        groupToursAssigned: groupToursCount,
        assignedTours,
        upcomingTours,
        ongoingTours,
        completedTours,
        pendingWork: tasksOnTours + pendingAssignedTasks
      };
    });

    coordinatorWorkload.sort((a, b) => b.assignedTours - a.assignedTours);

    // 5. TOUR COMPLETION / STATUS BREAKDOWN (REGULAR TOURS)
    const tourCompletionStatus = {
      upcoming: {
        count: upcomingToursCount,
        percentage: totalTours > 0 ? Number(((upcomingToursCount / totalTours) * 100).toFixed(1)) : 0
      },
      ongoing: {
        count: ongoingToursCount,
        percentage: totalTours > 0 ? Number(((ongoingToursCount / totalTours) * 100).toFixed(1)) : 0
      },
      completed: {
        count: completedToursCount,
        percentage: totalTours > 0 ? Number(((completedToursCount / totalTours) * 100).toFixed(1)) : 0
      },
      cancelled: {
        count: cancelledToursCount,
        percentage: totalTours > 0 ? Number(((cancelledToursCount / totalTours) * 100).toFixed(1)) : 0
      },
      total: totalTours
    };

    res.json({
      success: true,
      data: {
        summary: {
          upcomingTours: upcomingToursCount,
          ongoingTours: ongoingToursCount,
          completedTours: completedToursCount,
          cancelledTours: cancelledToursCount,
          totalTours
        },
        operationalWork: {
          pendingOperationalTasks: pendingTasksCount,
          pendingTicketBookings,
          pendingFlightTickets: pendingFlightTicketsCount,
          pendingTrainTickets: pendingTrainTicketsCount,
          pendingBusTickets: pendingBusTicketsCount,
          pendingHotelReservations,
          pendingTransportReservations,
          missingCustomerDocuments
        },
        tourCompletionStatus,
        coordinatorWorkload,
        groupTourOperations: {
          summary: {
            upcomingGroupDepartures,
            ongoingGroupDepartures,
            completedGroupDepartures,
            cancelledGroupDepartures,
            fullyBookedGroupTours,
            totalCapacity,
            totalBookedSeats,
            totalAvailableSeats,
            totalParticipants: totalBookedSeats,
            totalEstimatedRevenue
          },
          capacitySummary: {
            totalCapacity,
            totalBooked: totalBookedSeats,
            totalAvailable: totalAvailableSeats,
            fullyBookedCount: fullyBookedGroupTours,
            partiallyAvailableCount: partiallyAvailableGroupTours
          },
          upcomingDepartures: groupTourItems,
          destinationDemand: groupTourDestinationDemand
        }
      }
    });
  } catch (error) {
    console.error('Operations analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch operations analytics' });
  }
};

// 7. DASHBOARD FILTER OPTIONS
export const getFilterOptions = async (req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true }
    });
    const coordinators = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { toursCoordinated: { some: {} } },
          { createdGroupTours: { some: {} } },
          { department: { name: { contains: 'Operation', mode: 'insensitive' } } },
          { designation: { name: { contains: 'Coordinator', mode: 'insensitive' } } }
        ]
      },
      select: { id: true, firstName: true, lastName: true }
    });
    const packages = await prisma.travelPackage.findMany({
      select: { id: true, title: true }
    });
    const groupToursList = await prisma.groupTour.findMany({
      select: { id: true, title: true, groupTourRef: true }
    });
    const destinations = await prisma.destination.findMany({
      select: { id: true, name: true }
    });

    res.json({
      success: true,
      data: {
        employees: employees.map(e => ({ id: e.id, name: `${e.firstName} ${e.lastName}` })),
        coordinators: coordinators.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })),
        packages: packages.map(p => ({ id: p.id, name: p.title })),
        groupTours: groupToursList.map(gt => ({ id: gt.id, name: `${gt.groupTourRef} - ${gt.title}` })),
        destinations: destinations.map(d => ({ id: d.id, name: d.name })),
        tourStatuses: ['Upcoming', 'Preparation', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled'],
        sources: [
          { id: 'Website Package Booking', name: 'Website Package Booking' },
          { id: 'WEBSITE_GENERAL', name: 'Website General' },
          { id: 'WHATSAPP', name: 'WhatsApp' },
          { id: 'CONTACT_FORM', name: 'Contact Form' },
          { id: 'BLOG', name: 'Blog' },
        ]
      }
    });
  } catch (error) {
    console.error('Filter options error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch filter options' });
  }
};

// 8. CSV DATA EXPORT
export const exportAnalyticsCSV = async (req: Request, res: Response) => {
  try {
    const moduleType = (req.query.module as string) || 'overview';
    const { gte, lte } = parseFilterDates(req);

    if (moduleType === 'sales') {
      const enquiries = await prisma.enquiry.findMany({
        where: { createdAt: { gte, lte } },
        include: { customer: true }
      });
      let csv = 'Reference,Customer,Email,Phone,Source,Status,Travel Date,Travellers,Budget\n';
      enquiries.forEach(e => {
        csv += `"${e.referenceNumber}","${e.customer.firstName} ${e.customer.lastName || ''}","${e.customer.email}","${e.customer.phone || ''}","${e.source}","${e.status}","${e.travelDate || ''}","${e.travellerCount || 0}","${e.budgetRange || ''}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_analytics_export.csv"');
      return res.status(200).send(csv);
    }

    res.status(400).json({ success: false, message: 'Invalid module specified for CSV export' });
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export CSV analytics' });
  }
};
