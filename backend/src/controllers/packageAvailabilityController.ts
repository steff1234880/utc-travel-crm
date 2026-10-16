import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getPackageAvailability = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const availabilities = await prisma.packageAvailability.findMany({
      where: {
        packageId: id
      },
      orderBy: {
        startDate: 'asc'
      }
    });
    res.json({ success: true, data: availabilities });
  } catch (error) {
    console.error('Failed to fetch package availability:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch package availability' });
  }
};

export const togglePackageAvailability = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ success: false, message: 'Date is required' });
  }

  try {
    // Parse the date string as UTC
    const targetDate = new Date(`${date}T00:00:00Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);

    // Check if an availability record already exists for this exact date
    const existing = await prisma.packageAvailability.findFirst({
      where: {
        packageId: id,
        startDate: {
          gte: targetDate,
          lte: endDate
        }
      }
    });

    if (existing) {
      // Toggle it
      const updated = await prisma.packageAvailability.update({
        where: { id: existing.id },
        data: { isAvailable: !existing.isAvailable }
      });
      return res.json({ success: true, data: updated });
    } else {
      // Create a new unavailable record for this date
      const created = await prisma.packageAvailability.create({
        data: {
          packageId: id,
          startDate: targetDate,
          endDate: targetDate, // Same day
          isAvailable: false,
          isGroupTour: false, // Default
        }
      });
      return res.json({ success: true, data: created });
    }
  } catch (error) {
    console.error('Failed to toggle package availability:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle package availability' });
  }
};
