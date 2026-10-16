import api from './api';

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  recordId?: string;
  metadata?: any;
}

export const timelineService = {
  getTimeline: async (entityType: string, entityId: string): Promise<TimelineEvent[]> => {
    const response = await api.get(`/timeline/${entityType}/${entityId}`);
    return response.data.data;
  }
};
