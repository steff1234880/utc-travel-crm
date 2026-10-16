import api from './api';

export interface AppNotification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export const notificationService = {
  getMyNotifications: async (unreadOnly?: boolean): Promise<AppNotification[]> => {
    const response = await api.get('/notifications', { params: { unreadOnly } });
    return response.data.data;
  },
  
  markAsRead: async (id: string): Promise<AppNotification> => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  }
};
