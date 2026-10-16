import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getTourPricing = async (req: Request, res: Response) => {
  try {
    let tiers = await prisma.tourPricingTier.findMany({
      orderBy: { basePrice: 'asc' }
    });

    if (tiers.length === 0) {
      // Seed if empty
      const defaultTiers = [
        { id: '1', tierId: 'normal', tierName: 'Normal (Group Tour)', basePrice: 49999, adultPrice: 49999, child6to17: 34999, child2to5: 9999, infantPrice: 9999, singleSupplement: 0 },
        { id: '2', tierId: 'essential', tierName: 'Essential (Custom)', basePrice: 39999, adultPrice: 32999, child6to17: 32999, child2to5: 22999, infantPrice: 6999, singleSupplement: 12999 },
        { id: '3', tierId: 'signature', tierName: 'Signature (Custom)', basePrice: 59999, adultPrice: 49999, child6to17: 34999, child2to5: 9999, infantPrice: 9999, singleSupplement: 14999 },
        { id: '4', tierId: 'elite', tierName: 'Elite (Custom)', basePrice: 79999, adultPrice: 64999, child6to17: 44999, child2to5: 44999, infantPrice: 11999, singleSupplement: 15999 }
      ];
      await prisma.tourPricingTier.createMany({ data: defaultTiers });
      tiers = await prisma.tourPricingTier.findMany({ orderBy: { basePrice: 'asc' } });
    }

    res.json({ success: true, data: tiers });
  } catch (error) {
    console.error('Failed to get tour pricing:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tour pricing tiers' });
  }
};

export const updateTourPricing = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { adultPrice, child6to17, child2to5, infantPrice } = req.body;
  try {
    const updated = await prisma.tourPricingTier.update({
      where: { id: id as string },
      data: {
        adultPrice: Number(adultPrice),
        child6to17: Number(child6to17),
        child2to5: Number(child2to5),
        infantPrice: Number(infantPrice)
      }
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update tour pricing:', error);
    res.status(500).json({ success: false, error: 'Failed to update tour pricing' });
  }
};
