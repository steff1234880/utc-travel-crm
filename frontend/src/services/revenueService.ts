import api from './api';

export const revenueService = {
  getRevenueSummary: async () => {
    const response = await api.get('/accounting/revenue/summary');
    return response.data;
  },
  getRevenueRecords: async (params?: any) => {
    const response = await api.get('/accounting/revenue', { params });
    return response.data;
  },
  getRevenueReports: async (groupBy: 'package' | 'customer' | 'type') => {
    const response = await api.get('/accounting/revenue/reports', { params: { groupBy } });
    return response.data;
  },
  createRevenueRecord: async (data: any) => {
    const response = await api.post('/accounting/revenue', data);
    return response.data;
  },
  updateRevenueRecord: async (id: string, data: any) => {
    const response = await api.put(`/accounting/revenue/${id}`, data);
    return response.data;
  },
  getRevenueDetails: async (id: string) => {
    const response = await api.get(`/accounting/revenue/${id}`);
    return response.data;
  }
};
