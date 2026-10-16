import api from './api';

export interface Tour {
  id: string;
  tourReference: string;
  bookingPrepId?: string | null;
  quotationId?: string | null;
  customerId: string;
  packageId?: string | null;
  destination: string;
  startDate: string;
  endDate: string;
  travellerCount: number;
  coordinatorId?: string | null;
  operationalNotes?: string | null;
  status: 'Upcoming' | 'Preparation' | 'Confirmed' | 'Ongoing' | 'Completed' | 'Cancelled' | 'Postponed';
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
    phone?: string | null;
  };
  package?: {
    id: string;
    title?: string;
    packageName?: string;
  } | null;
  bookingPrep?: {
    id: string;
    bookingRef: string;
    quotationId?: string | null;
  } | null;
  coordinator?: {
    id: string;
    employeeId?: string;
    firstName: string;
    lastName: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
    user?: { email: string } | null;
    emergencyContact?: string | null;
  } | null;
  _count?: {
    travellers: number;
    checklistTasks: number;
    flightTickets: number;
    trainTickets: number;
    busTickets: number;
    hotelReservations: number;
  };
  travellers?: TourTraveller[];
  coordinatorAssignments?: TourCoordinatorAssignment[];
  checklistTasks?: OperationalTask[];
  flightTickets?: FlightTicket[];
  trainTickets?: TrainTicket[];
  busTickets?: BusTicket[];
  hotelReservations?: HotelReservation[];
}

export interface TourTraveller {
  id: string;
  tourId: string;
  name: string;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  passportNumber?: string | null;
  idProofType?: string | null;
  idProofNumber?: string | null;
  specialRequests?: string | null;
  createdAt: string;
}

export interface TourCoordinatorAssignment {
  id: string;
  tourId: string;
  employeeId: string;
  assignedById: string;
  assignedAt: string;
  unassignedAt?: string | null;
  notes?: string | null;
  status: string;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
  };
  assignedBy?: {
    id: string;
    employeeId?: string;
    firstName: string;
    lastName: string;
  };
}

export interface OperationalTask {
  id: string;
  tourId: string;
  task: string;
  category: string;
  assignedEmployeeId?: string | null;
  dueDate?: string | null;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string | null;
  completedById?: string | null;
  completedAt?: string | null;
  orderIndex: number;
  assignedEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  completedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface FlightTicket {
  id: string;
  tourId: string;
  passengerName: string;
  tourTravellerId?: string | null;
  bookingReference?: string | null;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDateTime: string;
  arrivalDateTime: string;
  pnr: string;
  ticketNumber?: string | null;
  ticketStatus: 'Requested' | 'Processing' | 'Confirmed' | 'Issued' | 'Cancelled' | 'Rescheduled';
  internalNotes?: string | null;
  tourTraveller?: TourTraveller | null;
  tour?: Tour | null;
}

export interface TrainTicket {
  id: string;
  tourId: string;
  passengerName: string;
  tourTravellerId?: string | null;
  operator: string;
  trainNumber: string;
  departureLocation: string;
  arrivalLocation: string;
  departureDateTime: string;
  arrivalDateTime: string;
  pnr: string;
  seatNumber?: string | null;
  trainClass?: string | null;
  ticketStatus: 'Requested' | 'Processing' | 'Confirmed' | 'Issued' | 'Cancelled' | 'Rescheduled';
  internalNotes?: string | null;
  tourTraveller?: TourTraveller | null;
  tour?: Tour | null;
}

export interface BusTicket {
  id: string;
  tourId: string;
  passengerName: string;
  tourTravellerId?: string | null;
  operator: string;
  busNumber?: string | null;
  departureLocation: string;
  arrivalLocation: string;
  departureDateTime: string;
  arrivalDateTime: string;
  pnr: string;
  seatNumber?: string | null;
  busClass?: string | null;
  ticketStatus: 'Requested' | 'Processing' | 'Confirmed' | 'Issued' | 'Cancelled' | 'Rescheduled';
  internalNotes?: string | null;
  tourTraveller?: TourTraveller | null;
  tour?: Tour | null;
}

export interface HotelReservation {
  id: string;
  tourId?: string | null;
  customerId: string;
  hotelName: string;
  destination: string;
  vendorReference?: string | null;
  bookingReference?: string | null;
  roomType?: string | null;
  numberOfRooms: number;
  numberOfGuests: number;
  checkInDate: string;
  checkOutDate: string;
  mealPlan?: string | null;
  confirmationNumber?: string | null;
  reservationStatus: 'Requested' | 'Pending' | 'Confirmed' | 'Modified' | 'Cancelled' | 'Completed';
  internalNotes?: string | null;
  createdAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
    phone?: string | null;
  };
  tour?: {
    id: string;
    tourReference: string;
    destination: string;
    startDate: string;
    endDate: string;
  } | null;
}

export interface CoordinatorEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department?: { name: string } | null;
  designation?: { name: string } | null;
  email?: string | null;
  emergencyContact?: string | null;
  activeTours?: number;
  upcomingTours?: number;
  ongoingTours?: number;
  completedTours?: number;
  _count?: {
    toursCoordinated: number;
  };
}

export interface Vendor {
  id: string;
  vendorCode: string;
  companyName: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  serviceType: 'Hotel' | 'Transport Provider' | 'Airline' | 'Activity Provider' | 'Local Guide' | 'Other Supplier' | string;
  paymentTerms?: string | null;
  internalNotes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    hotelReservations: number;
    transportReservations: number;
    operationalCosts: number;
  };
  hotelReservations?: HotelReservation[];
  transportReservations?: TransportReservation[];
  operationalCosts?: OperationalCost[];
}

export interface OperationalCost {
  id: string;
  costReference: string;
  tourId?: string | null;
  bookingPrepId?: string | null;
  vendorId?: string | null;
  costCategory: 'Hotel' | 'Flight' | 'Train' | 'Bus' | 'Transportation' | 'Activity' | 'Vendor' | 'Other' | string;
  description: string;
  estimatedCost: number;
  actualCost: number;
  currency: string;
  paymentStatus: 'Pending' | 'Partially Paid' | 'Paid' | 'Cancelled' | string;
  costDate: string;
  referenceNumber?: string | null;
  notes?: string | null;
  expenseId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  tour?: {
    id: string;
    tourReference: string;
    destination?: string;
  } | null;
  vendor?: {
    id: string;
    vendorCode: string;
    companyName: string;
  } | null;
  expense?: {
    id: string;
    expenseNumber: string;
    status: string;
    totalAmount: number;
  } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface TransportReservation {
  id: string;
  reservationNumber: string;
  tourId?: string | null;
  customerId?: string | null;
  vendorId?: string | null;
  transportType: 'Car' | 'Bus' | 'Van' | 'Train transfer' | 'Other' | string;
  vehicleServiceNumber?: string | null;
  pickupLocation: string;
  dropLocation: string;
  pickupDateTime: string;
  dropDateTime?: string | null;
  passengerCount: number;
  bookingReference?: string | null;
  confirmationNumber?: string | null;
  reservationStatus: 'Requested' | 'Pending' | 'Confirmed' | 'Modified' | 'Cancelled' | 'Completed' | string;
  estimatedCost: number;
  actualCost: number;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  tour?: {
    id: string;
    tourReference: string;
    destination?: string;
  } | null;
  customer?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
    phone?: string | null;
  } | null;
  vendor?: {
    id: string;
    vendorCode: string;
    companyName: string;
    phone?: string | null;
  } | null;
}

export interface OperationsDocument {
  id: string;
  documentCode: string;
  tourId?: string | null;
  customerId?: string | null;
  documentType: 'Flight Ticket' | 'Train Ticket' | 'Bus Ticket' | 'Hotel Voucher' | 'Booking Confirmation' | 'Customer Document' | 'Travel Document' | 'Package Document' | 'Operational File' | 'Other' | string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedById: string;
  expiryDate?: string | null;
  verificationStatus: 'Pending' | 'Verified' | 'Rejected' | 'Expired' | string;
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  tour?: {
    id: string;
    tourReference: string;
    destination?: string;
  } | null;
  customer?: {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
  } | null;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export const operationsService = {
  // 1. Dashboard
  getDashboardStats: async (params?: Record<string, any>) => {
    const res = await api.get('/operations/dashboard', { params });
    return res.data;
  },

  // 2. Tours
  getTours: async (params?: Record<string, any>) => {
    const res = await api.get('/operations/tours', { params });
    return res.data;
  },

  createTour: async (data: any) => {
    const res = await api.post('/operations/tours', data);
    return res.data;
  },

  getTourById: async (id: string): Promise<Tour> => {
    const res = await api.get(`/operations/tours/${id}`);
    return res.data;
  },

  updateTour: async (id: string, data: any) => {
    const res = await api.put(`/operations/tours/${id}`, data);
    return res.data;
  },

  deleteTour: async (id: string) => {
    const res = await api.delete(`/operations/tours/${id}`);
    return res.data;
  },

  // 3. Coordinators
  getCoordinators: async (): Promise<CoordinatorEmployee[]> => {
    const res = await api.get('/operations/coordinators');
    return res.data;
  },

  assignCoordinator: async (tourId: string, data: { coordinatorId: string; notes?: string }) => {
    const res = await api.post(`/operations/tours/${tourId}/coordinator`, data);
    return res.data;
  },

  removeCoordinator: async (tourId: string) => {
    const res = await api.delete(`/operations/tours/${tourId}/coordinator`);
    return res.data;
  },

  // 4. Checklist & Tasks
  getChecklist: async (tourId: string): Promise<OperationalTask[]> => {
    const res = await api.get(`/operations/tours/${tourId}/checklist`);
    return res.data;
  },

  addChecklistTask: async (tourId: string, data: any) => {
    const res = await api.post(`/operations/tours/${tourId}/checklist`, data);
    return res.data;
  },

  updateChecklistTask: async (taskId: string, data: any) => {
    const res = await api.put(`/operations/checklist/${taskId}`, data);
    return res.data;
  },

  // 5. Flight Tickets
  getFlightTickets: async (params?: Record<string, any>) => {
    const res = await api.get('/operations/tickets/flight', { params });
    return res.data;
  },

  createFlightTicket: async (data: any) => {
    const res = await api.post('/operations/tickets/flight', data);
    return res.data;
  },

  updateFlightTicket: async (ticketId: string, data: any) => {
    const res = await api.put(`/operations/tickets/flight/${ticketId}`, data);
    return res.data;
  },

  deleteFlightTicket: async (ticketId: string) => {
    const res = await api.delete(`/operations/tickets/flight/${ticketId}`);
    return res.data;
  },

  // 6. Train Tickets
  getTrainTickets: async (params?: Record<string, any>) => {
    const res = await api.get('/operations/tickets/train', { params });
    return res.data;
  },

  getTrainTicketById: async (ticketId: string): Promise<TrainTicket> => {
    const res = await api.get(`/operations/tickets/train/${ticketId}`);
    return res.data;
  },

  createTrainTicket: async (data: any) => {
    const res = await api.post('/operations/tickets/train', data);
    return res.data;
  },

  updateTrainTicket: async (ticketId: string, data: any) => {
    const res = await api.put(`/operations/tickets/train/${ticketId}`, data);
    return res.data;
  },

  deleteTrainTicket: async (ticketId: string) => {
    const res = await api.delete(`/operations/tickets/train/${ticketId}`);
    return res.data;
  },

  // 7. Bus Tickets
  getBusTickets: async (params?: Record<string, any>) => {
    const res = await api.get('/operations/tickets/bus', { params });
    return res.data;
  },

  getBusTicketById: async (ticketId: string): Promise<BusTicket> => {
    const res = await api.get(`/operations/tickets/bus/${ticketId}`);
    return res.data;
  },

  createBusTicket: async (data: any) => {
    const res = await api.post('/operations/tickets/bus', data);
    return res.data;
  },

  updateBusTicket: async (ticketId: string, data: any) => {
    const res = await api.put(`/operations/tickets/bus/${ticketId}`, data);
    return res.data;
  },

  deleteBusTicket: async (ticketId: string) => {
    const res = await api.delete(`/operations/tickets/bus/${ticketId}`);
    return res.data;
  },

  // 8. Hotel Reservations
  getHotelReservations: async (params?: Record<string, any>) => {
    const res = await api.get('/operations/hotels', { params });
    return res.data;
  },

  createHotelReservation: async (data: any) => {
    const res = await api.post('/operations/hotels', data);
    return res.data;
  },

  updateHotelReservation: async (id: string, data: any) => {
    const res = await api.put(`/operations/hotels/${id}`, data);
    return res.data;
  },

  deleteHotelReservation: async (id: string) => {
    const res = await api.delete(`/operations/hotels/${id}`);
    return res.data;
  },

  // Reference helper queries
  getCustomers: async () => {
    const res = await api.get('/crm/customers');
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.customers)) return data.customers;
    return [];
  },

  getPackages: async () => {
    const res = await api.get('/packages');
    return res.data;
  },

  getBookingPreparations: async () => {
    const res = await api.get('/crm/sales/bookings/preparations');
    return res.data;
  },

  // 9. Vendor Management (Part 2)
  getVendors: async (params?: Record<string, any>) => {
    const res = await api.get('/operations/vendors', { params });
    return res.data;
  },

  createVendor: async (data: any) => {
    const res = await api.post('/operations/vendors', data);
    return res.data;
  },

  getVendorById: async (id: string): Promise<Vendor> => {
    const res = await api.get(`/operations/vendors/${id}`);
    return res.data;
  },

  updateVendor: async (id: string, data: any) => {
    const res = await api.put(`/operations/vendors/${id}`, data);
    return res.data;
  },

  updateVendorStatus: async (id: string, isActive: boolean) => {
    const res = await api.patch(`/operations/vendors/${id}/status`, { isActive });
    return res.data;
  },

  // 10. Operational Cost Tracking (Part 2)
  getOperationalCosts: async (params?: Record<string, any>) => {
    const res = await api.get('/operations/costs', { params });
    return res.data;
  },

  createOperationalCost: async (data: any) => {
    const res = await api.post('/operations/costs', data);
    return res.data;
  },

  getOperationalCostById: async (id: string): Promise<OperationalCost> => {
    const res = await api.get(`/operations/costs/${id}`);
    return res.data;
  },

  updateOperationalCost: async (id: string, data: any) => {
    const res = await api.put(`/operations/costs/${id}`, data);
    return res.data;
  },

  updateCostStatus: async (id: string, paymentStatus: string) => {
    const res = await api.patch(`/operations/costs/${id}/status`, { paymentStatus });
    return res.data;
  },

  deleteOperationalCost: async (id: string): Promise<{ message: string }> => {
    const res = await api.delete(`/operations/costs/${id}`);
    return res.data;
  },

  // 11. Transport Reservations (Part 2)
  getTransportReservations: async (params?: Record<string, any>) => {
    const res = await api.get('/operations/transport', { params });
    return res.data;
  },

  createTransportReservation: async (data: any) => {
    const res = await api.post('/operations/transport', data);
    return res.data;
  },

  getTransportById: async (id: string): Promise<TransportReservation> => {
    const res = await api.get(`/operations/transport/${id}`);
    return res.data;
  },

  updateTransportReservation: async (id: string, data: any) => {
    const res = await api.put(`/operations/transport/${id}`, data);
    return res.data;
  },

  updateTransportStatus: async (id: string, status: string) => {
    const res = await api.patch(`/operations/transport/${id}/status`, { status });
    return res.data;
  },

  // 12. Operations Document Management (Part 2)
  getDocuments: async (params?: Record<string, any>) => {
    const res = await api.get('/operations/documents', { params });
    return res.data;
  },

  uploadDocument: async (formData: FormData) => {
    const res = await api.post('/operations/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getDocumentById: async (id: string): Promise<OperationsDocument> => {
    const res = await api.get(`/operations/documents/${id}`);
    return res.data;
  },

  downloadDocument: async (id: string, fileName: string) => {
    const res = await api.get(`/operations/documents/${id}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  verifyDocument: async (id: string, data: { verificationStatus: string; rejectionReason?: string }) => {
    const res = await api.patch(`/operations/documents/${id}/verify`, data);
    return res.data;
  },

  deleteDocument: async (id: string) => {
    const res = await api.delete(`/operations/documents/${id}`);
    return res.data;
  },

  // 13. Operations Reports (Part 2)
  getReport: async (reportType: string, params?: Record<string, any>) => {
    const res = await api.get(`/operations/reports/${reportType}`, { params });
    return res.data;
  },

  downloadReportCsv: async (reportType: string, params?: Record<string, any>) => {
    const res = await api.get(`/operations/reports/${reportType}`, {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportType}_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
