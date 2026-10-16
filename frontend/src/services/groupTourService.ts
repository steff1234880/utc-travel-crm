import api from './api';

export interface GroupTourCalendarItem {
  id: string;
  groupTourRef: string;
  packageId?: string | null;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  pricePerPerson: number;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  bookingDeadline: string;
  status: 'Open' | 'Almost Full' | 'Full' | 'Completed' | 'Cancelled';
  imageUrl?: string | null;
  description?: string | null;
  isJoinable: boolean;
  pricing?: GroupTourPricingItem[];
}

export interface GroupTourDetail extends GroupTourCalendarItem {
  package?: {
    id: string;
    title: string;
    slug: string;
    overview?: string;
    durationDays?: number;
    durationNights?: number;
    images?: { url: string }[];
  } | null;
}

export interface GroupTourPricingItem {
  id?: string;
  title: string;
  adultPrice: number;
  child6to17Price: number;
  child2to5Price: number;
  infantPrice: number;
}

export interface AdminGroupTour {
  id: string;
  groupTourRef: string;
  packageId?: string | null;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  pricePerPerson: number;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  bookingDeadline: string;
  status: 'Open' | 'Almost Full' | 'Full' | 'Completed' | 'Cancelled';
  description?: string | null;
  imageUrl?: string | null;
  pricing?: GroupTourPricingItem[];
  package?: { id: string; title: string; pricingVars?: GroupTourPricingItem[] } | null;
  createdBy?: { firstName: string; lastName: string } | null;
  bookings?: {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    numberOfPeople: number;
    createdAt: string;
  }[];
}

export const groupTourService = {
  // Public Methods
  getCalendarGroupTours: async (month?: number, year?: number): Promise<GroupTourCalendarItem[]> => {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const res = await api.get('/group-tours/calendar', { params });
    return res.data.data;
  },

  getPublicGroupTourById: async (id: string): Promise<GroupTourDetail> => {
    const res = await api.get(`/group-tours/public/${id}`);
    return res.data;
  },

  joinGroupTour: async (
    id: string,
    data: {
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      numberOfPeople: number;
      notes?: string;
    }
  ) => {
    const res = await api.post(`/group-tours/public/${id}/join`, data);
    return res.data;
  },

  // Admin Methods
  getAdminGroupTours: async (params?: Record<string, any>) => {
    const res = await api.get('/group-tours/admin/list', { params });
    return res.data;
  },

  createGroupTour: async (data: any) => {
    const res = await api.post('/group-tours/admin/create', data);
    return res.data;
  },

  updateGroupTour: async (id: string, data: any) => {
    const res = await api.put(`/group-tours/admin/${id}`, data);
    return res.data;
  },

  deleteGroupTour: async (id: string) => {
    const res = await api.delete(`/group-tours/admin/${id}`);
    return res.data;
  },
};
