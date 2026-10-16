import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getPackages = async (req: Request, res: Response) => {
  try {
    const { destinationId, status, search, featured } = req.query;

    const where: any = {};
    if (status) {
      where.status = String(status);
    } else {
      // Default to PUBLISHED for public requests if not admin specifying status
      if (req.path.startsWith('/public') || !req.user) {
        where.status = 'PUBLISHED';
      }
    }

    if (destinationId) where.destinationId = String(destinationId);
    if (featured === 'true') where.isFeatured = true;

    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { overview: { contains: String(search), mode: 'insensitive' } },
        { destination: { name: { contains: String(search), mode: 'insensitive' } } }
      ];
    }

    const packages = await prisma.travelPackage.findMany({
      where,
      include: {
        destination: true,
        category: true,
        images: true,
        highlights: true,
        pricingVars: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: packages });
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch packages' });
  }
};

export const getPackageBySlug = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const pkg = await prisma.travelPackage.findUnique({
      where: { slug },
      include: {
        destination: true,
        category: true,
        travelType: true,
        images: true,
        videos: true,
        highlights: true,
        pricingVars: true,
        topHighlights: { orderBy: { displayOrder: 'asc' } },
        itineraryDays: { include: { activities: true }, orderBy: { dayNumber: 'asc' } },
        inclusions: true,
        exclusions: true,
      }
    });

    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch package details' });
  }
};

export const createPackage = async (req: Request, res: Response) => {
  try {
    const { title, slug, overview, durationDays, durationNights, destinationId, basePrice, currency, isFeatured, status, image, pricingVars, mapImage, itineraryDays } = req.body;

    const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const newPkg = await prisma.travelPackage.create({
      data: {
        title,
        slug: generatedSlug,
        overview: overview || '',
        durationDays: Number(durationDays) || 1,
        durationNights: Number(durationNights) || 0,
        destinationId,
        basePrice: basePrice ? Number(basePrice) : null,
        currency: currency || 'USD',
        isFeatured: Boolean(isFeatured),
        status: status || 'PUBLISHED',
        mapImage: mapImage || null,
        images: image ? { create: [{ url: image, isFeatured: true }] } : undefined,
        pricingVars: pricingVars && pricingVars.length > 0 ? {
          create: pricingVars.map((pv: any) => ({
            title: pv.title,
            price: Number(pv.adultPrice) || 0,
            adultPrice: Number(pv.adultPrice) || 0,
            child6to17Price: Number(pv.child6to17Price) || 0,
            child2to5Price: Number(pv.child2to5Price) || 0,
            infantPrice: Number(pv.infantPrice) || 0
          }))
        } : undefined,
        itineraryDays: itineraryDays && itineraryDays.length > 0 ? {
          create: itineraryDays.map((day: any) => ({
            dayNumber: Number(day.dayNumber),
            title: day.title || '',
            description: day.description || '',
            image: day.image || null,
          }))
        } : undefined
      },
      include: { destination: true, images: true, pricingVars: true, itineraryDays: true }
    });

    res.status(201).json({ success: true, data: newPkg });
  } catch (error: any) {
    console.error('Create package error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create package' });
  }
};

export const updatePackage = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, overview, durationDays, durationNights, destinationId, basePrice, currency, isFeatured, status, heroImage, highlightsVideo, pricingVars, mapImage, itineraryDays } = req.body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (overview !== undefined) updateData.overview = overview;
    if (durationDays !== undefined) updateData.durationDays = Number(durationDays);
    if (durationNights !== undefined) updateData.durationNights = Number(durationNights);
    if (destinationId) updateData.destinationId = destinationId;
    if (basePrice !== undefined) updateData.basePrice = Number(basePrice);
    if (currency) updateData.currency = currency;
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
    if (status) updateData.status = status;
    if (heroImage !== undefined) updateData.heroImage = heroImage;
    if (highlightsVideo !== undefined) updateData.highlightsVideo = highlightsVideo;
    if (mapImage !== undefined) updateData.mapImage = mapImage;

    if (pricingVars && Array.isArray(pricingVars)) {
      updateData.pricingVars = {
        deleteMany: {},
        create: pricingVars.map((pv: any) => ({
          title: pv.title,
          price: Number(pv.adultPrice) || 0,
          adultPrice: Number(pv.adultPrice) || 0,
          child6to17Price: Number(pv.child6to17Price) || 0,
          child2to5Price: Number(pv.child2to5Price) || 0,
          infantPrice: Number(pv.infantPrice) || 0
        }))
      };
    }

    if (itineraryDays && Array.isArray(itineraryDays)) {
      updateData.itineraryDays = {
        deleteMany: {},
        create: itineraryDays.map((day: any) => ({
          dayNumber: Number(day.dayNumber),
          title: day.title || '',
          description: day.description || '',
          image: day.image || null,
        }))
      };
    }

    const updated = await prisma.travelPackage.update({
      where: { id },
      data: updateData,
      include: { destination: true, images: true, topHighlights: true, pricingVars: true, itineraryDays: true }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(400).json({ success: false, message: 'Failed to update package' });
  }
};

export const uploadPackageFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/packages/${req.file.filename}`;
    res.status(200).json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('Upload package file error:', error);
    res.status(500).json({ success: false, message: error.message || 'File upload failed' });
  }
};

export const deletePackageHero = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await prisma.travelPackage.update({
      where: { id },
      data: { heroImage: null }
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete hero image' });
  }
};

export const deletePackageVideo = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = await prisma.travelPackage.update({
      where: { id },
      data: { highlightsVideo: null }
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete package video' });
  }
};

export const getTopHighlights = async (req: Request, res: Response) => {
  try {
    const packageId = req.params.id as string;
    const highlights = await prisma.packageTopHighlight.findMany({
      where: { packageId },
      orderBy: { displayOrder: 'asc' }
    });
    res.status(200).json({ success: true, data: highlights });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch top highlights' });
  }
};

export const createTopHighlight = async (req: Request, res: Response) => {
  try {
    const packageId = req.params.id as string;
    const { title, description, image, displayOrder, isActive } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Highlight title is required' });
    }

    const count = await prisma.packageTopHighlight.count({ where: { packageId } });

    const newHighlight = await prisma.packageTopHighlight.create({
      data: {
        packageId,
        title,
        description: description || null,
        image: image || null,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : count + 1,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });

    res.status(201).json({ success: true, data: newHighlight });
  } catch (error: any) {
    console.error('Create top highlight error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create top highlight' });
  }
};

export const updateTopHighlight = async (req: Request, res: Response) => {
  try {
    const { highlightId } = req.params;
    const { title, description, image, displayOrder, isActive } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.packageTopHighlight.update({
      where: { id: highlightId as string },
      data: updateData
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Update top highlight error:', error);
    res.status(400).json({ success: false, message: 'Failed to update top highlight' });
  }
};

export const deleteTopHighlight = async (req: Request, res: Response) => {
  try {
    const { highlightId } = req.params;
    await prisma.packageTopHighlight.delete({ where: { id: highlightId as string } });
    res.status(200).json({ success: true, message: 'Highlight deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete top highlight' });
  }
};

export const reorderTopHighlights = async (req: Request, res: Response) => {
  try {
    const { items } = req.body; // Array of { id: string, displayOrder: number }
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Invalid items array' });
    }

    const updates = items.map((item: { id: string; displayOrder: number }) =>
      prisma.packageTopHighlight.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder }
      })
    );

    await prisma.$transaction(updates);

    res.status(200).json({ success: true, message: 'Reordered highlights successfully' });
  } catch (error) {
    console.error('Reorder highlights error:', error);
    res.status(500).json({ success: false, message: 'Failed to reorder highlights' });
  }
};

export const deletePackage = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.travelPackage.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete package' });
  }
};

export const getDestinations = async (req: Request, res: Response) => {
  try {
    const dests = await prisma.destination.findMany({
      orderBy: { name: 'asc' }
    });
    res.status(200).json({ success: true, data: dests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch destinations' });
  }
};
