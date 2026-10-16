import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getGlobalCalendar = async (req: Request, res: Response) => {
  try {
    const availabilities = await prisma.globalAvailability.findMany({
      orderBy: {
        date: 'asc'
      }
    });
    res.json({ success: true, data: availabilities });
  } catch (error) {
    console.error('Failed to fetch global availability:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch global availability' });
  }
};

export const toggleGlobalCalendar = async (req: Request, res: Response) => {
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ success: false, message: 'Date is required' });
  }

  try {
    const targetDate = new Date(`${date}T00:00:00Z`);

    const existing = await prisma.globalAvailability.findFirst({
      where: {
        date: targetDate
      }
    });

    if (existing) {
      // Toggle it
      const updated = await prisma.globalAvailability.update({
        where: { id: existing.id },
        data: { isAvailable: !existing.isAvailable }
      });
      return res.json({ success: true, data: updated });
    } else {
      // Create a new unavailable record for this date
      const created = await prisma.globalAvailability.create({
        data: {
          date: targetDate,
          isAvailable: false
        }
      });
      return res.json({ success: true, data: created });
    }
  } catch (error) {
    console.error('Failed to toggle global availability:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle global availability' });
  }
};

export const getAvailableTripsByDate = async (req: Request, res: Response) => {
  const startDateStr = req.query.startDate as string;
  const endDateStr = (req.query.endDate as string) || startDateStr;
  
  if (!startDateStr) return res.status(400).json({ success: false, message: 'startDate is required' });

  try {
    const targetDate = new Date(`${startDateStr}T00:00:00Z`);
    const endDate = new Date(`${endDateStr}T23:59:59.999Z`);

    // Get all published packages
    const allPackages = await prisma.travelPackage.findMany({
      where: { status: 'PUBLISHED' },
      include: { destination: true, images: true }
    });

    // Get all unavailabilities for this date range
    const unavailabilities = await prisma.packageAvailability.findMany({
      where: {
        startDate: { lte: endDate },
        endDate: { gte: targetDate },
        isAvailable: false
      }
    });

    const unavailablePackageIds = new Set(unavailabilities.map(u => u.packageId));

    // Filter out packages that have an unavailability record for this date
    const availablePackages = allPackages.filter(pkg => !unavailablePackageIds.has(pkg.id));

    res.json({ success: true, data: availablePackages });
  } catch (error) {
    console.error('Failed to fetch available trips:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch available trips' });
  }
};
