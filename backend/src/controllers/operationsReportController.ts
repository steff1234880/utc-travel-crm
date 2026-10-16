import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { logOperationsActivity } from '../utils/auditLogger';

// Helper to escape fields for CSV output
function formatCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function convertToCsv(headers: string[], rows: any[][]): string {
  const headerLine = headers.map(formatCsvField).join(',');
  const rowLines = rows.map((row) => row.map(formatCsvField).join(','));
  return [headerLine, ...rowLines].join('\n');
}

// 1. Tour Operations Report
export const getTourOperationsReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, destination, coordinatorId, dateFrom, dateTo, format } = req.query;

    const whereClause: any = {};
    if (status && status !== 'ALL') whereClause.status = status as string;
    if (destination) whereClause.destination = { contains: destination as string, mode: 'insensitive' };
    if (coordinatorId) whereClause.coordinatorId = coordinatorId as string;

    if (dateFrom || dateTo) {
      whereClause.startDate = {};
      if (dateFrom) whereClause.startDate.gte = new Date(dateFrom as string);
      if (dateTo) whereClause.startDate.lte = new Date(dateTo as string);
    }

    const tours = await prisma.tour.findMany({
      where: whereClause,
      orderBy: { startDate: 'desc' },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        coordinator: { select: { firstName: true, lastName: true, employeeId: true } },
        package: { select: { title: true } },
        _count: {
          select: {
            flightTickets: true,
            trainTickets: true,
            busTickets: true,
            hotelReservations: true,
          },
        },
      },
    });

    if (format === 'csv') {
      const headers = ['Tour Ref', 'Customer', 'Email', 'Destination', 'Package', 'Start Date', 'End Date', 'Travellers', 'Coordinator', 'Status', 'Tickets Count', 'Hotels Count'];
      const rows = tours.map((t) => [
        t.tourReference,
        `${t.customer?.firstName || ''} ${t.customer?.lastName || ''}`.trim(),
        t.customer?.email || '',
        t.destination,
        t.package?.title || 'Custom',
        new Date(t.startDate).toISOString().slice(0, 10),
        new Date(t.endDate).toISOString().slice(0, 10),
        t.travellerCount,
        t.coordinator ? `${t.coordinator.firstName} ${t.coordinator.lastName} (${t.coordinator.employeeId})` : 'Unassigned',
        t.status,
        (t._count.flightTickets + t._count.trainTickets + t._count.busTickets),
        t._count.hotelReservations,
      ]);

      const csv = convertToCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="tour_operations_report_${Date.now()}.csv"`);
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({ tours, total: tours.length });
  } catch (error: any) {
    console.error('Error generating tour operations report:', error);
    res.status(500).json({ error: 'Failed to generate tour operations report' });
  }
};

// 2. Coordinator Workload Report
export const getCoordinatorWorkloadReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format } = req.query;

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        toursCoordinated: {
          select: { id: true, status: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    const report = employees.map((e) => {
      const tours = e.toursCoordinated || [];
      const active = tours.filter((t) => ['Upcoming', 'Preparation', 'Confirmed', 'Ongoing'].includes(t.status)).length;
      const upcoming = tours.filter((t) => ['Upcoming', 'Preparation', 'Confirmed'].includes(t.status)).length;
      const ongoing = tours.filter((t) => t.status === 'Ongoing').length;
      const completed = tours.filter((t) => t.status === 'Completed').length;

      return {
        id: e.id,
        employeeId: e.employeeId,
        coordinatorName: `${e.firstName} ${e.lastName}`,
        department: e.department?.name || 'N/A',
        designation: e.designation?.name || 'N/A',
        activeTours: active,
        upcomingTours: upcoming,
        ongoingTours: ongoing,
        completedTours: completed,
        totalCoordinated: tours.length,
      };
    });

    if (format === 'csv') {
      const headers = ['Employee ID', 'Coordinator Name', 'Department', 'Designation', 'Active Tours', 'Upcoming', 'Ongoing', 'Completed', 'Total Coordinated'];
      const rows = report.map((r) => [
        r.employeeId,
        r.coordinatorName,
        r.department,
        r.designation,
        r.activeTours,
        r.upcomingTours,
        r.ongoingTours,
        r.completedTours,
        r.totalCoordinated,
      ]);

      const csv = convertToCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="coordinator_workload_report_${Date.now()}.csv"`);
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({ coordinators: report });
  } catch (error: any) {
    console.error('Error generating coordinator workload report:', error);
    res.status(500).json({ error: 'Failed to generate coordinator workload report' });
  }
};

// 3. Ticket Status Report
export const getTicketStatusReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format } = req.query;

    const [flights, trains, buses] = await Promise.all([
      prisma.flightTicket.findMany({ include: { tour: { select: { tourReference: true } } } }),
      prisma.trainTicket.findMany({ include: { tour: { select: { tourReference: true } } } }),
      prisma.busTicket.findMany({ include: { tour: { select: { tourReference: true } } } }),
    ]);

    const totalTickets = flights.length + trains.length + buses.length;

    if (format === 'csv') {
      const headers = ['Type', 'Passenger Name', 'Tour Ref', 'Carrier/Operator', 'PNR', 'Departure', 'Arrival', 'Status'];
      const rows = [
        ...flights.map((f) => ['Flight', f.passengerName, f.tour.tourReference, `${f.airline} ${f.flightNumber}`, f.pnr, new Date(f.departureDateTime).toISOString(), new Date(f.arrivalDateTime).toISOString(), f.ticketStatus]),
        ...trains.map((t) => ['Train', t.passengerName, t.tour.tourReference, `${t.operator} ${t.trainNumber}`, t.pnr, new Date(t.departureDateTime).toISOString(), new Date(t.arrivalDateTime).toISOString(), t.ticketStatus]),
        ...buses.map((b) => ['Bus', b.passengerName, b.tour.tourReference, `${b.operator} ${b.busNumber || ''}`, b.pnr, new Date(b.departureDateTime).toISOString(), new Date(b.arrivalDateTime).toISOString(), b.ticketStatus]),
      ];

      const csv = convertToCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ticket_status_report_${Date.now()}.csv"`);
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({
      summary: {
        totalTickets,
        flightsCount: flights.length,
        trainsCount: trains.length,
        busesCount: buses.length,
      },
      flights,
      trains,
      buses,
    });
  } catch (error: any) {
    console.error('Error generating ticket status report:', error);
    res.status(500).json({ error: 'Failed to generate ticket status report' });
  }
};

// 4. Hotel Reservation Report
export const getHotelReservationReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, format } = req.query;
    const whereClause: any = {};
    if (status && status !== 'ALL') whereClause.reservationStatus = status as string;

    const hotels = await prisma.hotelReservation.findMany({
      where: whereClause,
      orderBy: { checkInDate: 'asc' },
      include: {
        tour: { select: { tourReference: true } },
        customer: { select: { firstName: true, lastName: true } },
        vendor: { select: { companyName: true } },
      },
    });

    if (format === 'csv') {
      const headers = ['Hotel Name', 'Destination', 'Tour Ref', 'Customer', 'Vendor', 'Check-In', 'Check-Out', 'Rooms', 'Guests', 'Confirmation #', 'Status'];
      const rows = hotels.map((h) => [
        h.hotelName,
        h.destination,
        h.tour?.tourReference || '-',
        `${h.customer.firstName} ${h.customer.lastName || ''}`.trim(),
        h.vendor?.companyName || '-',
        new Date(h.checkInDate).toISOString().slice(0, 10),
        new Date(h.checkOutDate).toISOString().slice(0, 10),
        h.numberOfRooms,
        h.numberOfGuests,
        h.confirmationNumber || '-',
        h.reservationStatus,
      ]);

      const csv = convertToCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="hotel_reservation_report_${Date.now()}.csv"`);
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({ hotels, total: hotels.length });
  } catch (error: any) {
    console.error('Error generating hotel reservation report:', error);
    res.status(500).json({ error: 'Failed to generate hotel reservation report' });
  }
};

// 5. Vendor Report
export const getVendorReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceType, format } = req.query;
    const whereClause: any = {};
    if (serviceType && serviceType !== 'ALL') whereClause.serviceType = serviceType as string;

    const vendors = await prisma.vendor.findMany({
      where: whereClause,
      orderBy: { companyName: 'asc' },
      include: {
        _count: {
          select: {
            hotelReservations: true,
            transportReservations: true,
            operationalCosts: true,
          },
        },
      },
    });

    if (format === 'csv') {
      const headers = ['Vendor Code', 'Company Name', 'Service Type', 'Contact Person', 'Phone', 'Email', 'Active', 'Hotel Bookings', 'Transport Bookings', 'Operational Costs Recorded'];
      const rows = vendors.map((v) => [
        v.vendorCode,
        v.companyName,
        v.serviceType,
        v.contactPerson || '-',
        v.phone || '-',
        v.email || '-',
        v.isActive ? 'Yes' : 'No',
        v._count.hotelReservations,
        v._count.transportReservations,
        v._count.operationalCosts,
      ]);

      const csv = convertToCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="vendor_report_${Date.now()}.csv"`);
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({ vendors, total: vendors.length });
  } catch (error: any) {
    console.error('Error generating vendor report:', error);
    res.status(500).json({ error: 'Failed to generate vendor report' });
  }
};

// 6. Operational Cost Report (Decimal-Safe INR)
export const getOperationalCostReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, paymentStatus, format } = req.query;
    const whereClause: any = {};
    if (category && category !== 'ALL') whereClause.costCategory = category as string;
    if (paymentStatus && paymentStatus !== 'ALL') whereClause.paymentStatus = paymentStatus as string;

    const costs = await prisma.operationalCost.findMany({
      where: whereClause,
      orderBy: { costDate: 'desc' },
      include: {
        tour: { select: { tourReference: true } },
        vendor: { select: { companyName: true } },
        expense: { select: { expenseNumber: true } },
      },
    });

    const agg = await prisma.operationalCost.aggregate({
      where: whereClause,
      _sum: { estimatedCost: true, actualCost: true },
    });

    if (format === 'csv') {
      const headers = ['Cost Ref', 'Category', 'Description', 'Tour Ref', 'Vendor', 'Cost Date', 'Estimated (INR)', 'Actual (INR)', 'Payment Status', 'Accounting Expense Ref'];
      const rows = costs.map((c) => [
        c.costReference,
        c.costCategory,
        c.description,
        c.tour?.tourReference || '-',
        c.vendor?.companyName || '-',
        new Date(c.costDate).toISOString().slice(0, 10),
        Number(c.estimatedCost).toFixed(2),
        Number(c.actualCost).toFixed(2),
        c.paymentStatus,
        c.expense?.expenseNumber || '-',
      ]);

      const csv = convertToCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="operational_cost_report_${Date.now()}.csv"`);
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({
      costs,
      totalEstimated: agg._sum.estimatedCost ? Number(agg._sum.estimatedCost) : 0,
      totalActual: agg._sum.actualCost ? Number(agg._sum.actualCost) : 0,
    });
  } catch (error: any) {
    console.error('Error generating operational cost report:', error);
    res.status(500).json({ error: 'Failed to generate operational cost report' });
  }
};

// 7. Document Status Report
export const getDocumentStatusReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentType, verificationStatus, format } = req.query;
    const whereClause: any = {};
    if (documentType && documentType !== 'ALL') whereClause.documentType = documentType as string;
    if (verificationStatus && verificationStatus !== 'ALL') whereClause.verificationStatus = verificationStatus as string;

    const documents = await prisma.operationsDocument.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        tour: { select: { tourReference: true } },
        customer: { select: { firstName: true, lastName: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (format === 'csv') {
      const headers = ['Doc Code', 'Document Type', 'File Name', 'Tour Ref', 'Customer', 'Uploaded By', 'Uploaded Date', 'Expiry Date', 'Verification Status'];
      const rows = documents.map((d) => [
        d.documentCode,
        d.documentType,
        d.fileName,
        d.tour?.tourReference || '-',
        d.customer ? `${d.customer.firstName} ${d.customer.lastName || ''}`.trim() : '-',
        `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`,
        new Date(d.createdAt).toISOString().slice(0, 10),
        d.expiryDate ? new Date(d.expiryDate).toISOString().slice(0, 10) : '-',
        d.verificationStatus,
      ]);

      const csv = convertToCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="document_status_report_${Date.now()}.csv"`);
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({ documents, total: documents.length });
  } catch (error: any) {
    console.error('Error generating document status report:', error);
    res.status(500).json({ error: 'Failed to generate document status report' });
  }
};

// 8. Tour Completion Report
export const getTourCompletionReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format } = req.query;

    const tours = await prisma.tour.findMany({
      where: { status: 'Completed' },
      orderBy: { endDate: 'desc' },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        coordinator: { select: { firstName: true, lastName: true, employeeId: true } },
        package: { select: { title: true, packageName: true } },
      },
    });

    if (format === 'csv') {
      const headers = ['Tour Ref', 'Customer Name', 'Customer Email', 'Destination', 'Package', 'Start Date', 'Completion Date', 'Traveller Count', 'Coordinator'];
      const rows = tours.map((t) => [
        t.tourReference,
        `${t.customer?.firstName || ''} ${t.customer?.lastName || ''}`.trim(),
        t.customer?.email || '-',
        t.destination,
        t.package?.title || t.package?.packageName || 'Custom',
        new Date(t.startDate).toISOString().slice(0, 10),
        new Date(t.endDate).toISOString().slice(0, 10),
        t.travellerCount,
        t.coordinator ? `${t.coordinator.firstName} ${t.coordinator.lastName} (${t.coordinator.employeeId})` : 'Unassigned',
      ]);

      const csv = convertToCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="tour_completion_report_${Date.now()}.csv"`);
      res.status(200).send(csv);
      return;
    }

    res.status(200).json({ tours, total: tours.length });
  } catch (error: any) {
    console.error('Error generating tour completion report:', error);
    res.status(500).json({ error: 'Failed to generate tour completion report' });
  }
};
