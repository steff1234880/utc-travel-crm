import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMyNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { unreadOnly } = req.query;
    
    let whereClause: any = { recipientId: userId };
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100 // limits to recent
    });

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const notificationId = id as string;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (notification.recipientId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

// Helper to create notifications internally (used by other controllers)
export const createNotification = async (
  recipientId: string, 
  type: string, 
  title: string, 
  message: string, 
  relatedEntityType?: string, 
  relatedEntityId?: string
) => {
  try {
    await prisma.notification.create({
      data: {
        recipientId,
        type,
        title,
        message,
        relatedEntityType,
        relatedEntityId
      }
    });
  } catch (error) {
    console.error('Failed to create internal notification:', error);
  }
};
