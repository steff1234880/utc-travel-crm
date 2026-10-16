import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  profilePhoto: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// We no longer use an in-memory fallback here.
// System settings are fetched dynamically from the database.

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        employee: {
          include: { department: true, designation: true }
        }
      }
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role?.name || 'User',
        employeeId: user.employee?.employeeId || 'N/A',
        firstName: user.employee?.firstName || user.email.split('@')[0],
        lastName: user.employee?.lastName || '',
        address: user.employee?.address || '',
        emergencyContact: user.employee?.emergencyContact || '',
        profilePhoto: user.employee?.profilePhoto || '',
        department: user.employee?.department?.name || 'N/A',
        designation: user.employee?.designation?.name || 'N/A',
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { employee: true } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.employee) {
      await prisma.employee.update({
        where: { id: user.employee.id },
        data: {
          firstName: data.firstName !== undefined ? data.firstName : user.employee.firstName,
          lastName: data.lastName !== undefined ? data.lastName : user.employee.lastName,
          address: data.address !== undefined ? data.address : user.employee.address,
          emergencyContact: data.emergencyContact !== undefined ? data.emergencyContact : user.employee.emergencyContact,
          profilePhoto: data.profilePhoto !== undefined ? data.profilePhoto : user.employee.profilePhoto,
        }
      });
    } else {
      await prisma.employee.create({
        data: {
          userId: user.id,
          employeeId: `ADM-${Date.now().toString().slice(-6)}`,
          firstName: data.firstName !== undefined ? data.firstName : user.email.split('@')[0],
          lastName: data.lastName || '',
          address: data.address || '',
          emergencyContact: data.emergencyContact || '',
          profilePhoto: data.profilePhoto || '',
        }
      });
    }

    res.status(200).json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.passwordHash !== currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPassword }
    });

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

export const getSystemSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: 'default',
          companyName: 'Universal Travel Company',
          supportEmail: 'support@utctravel.com',
          supportPhone: '+1 (800) 555-UTC1',
          currency: 'USD',
          timezone: 'UTC+03:00',
          notificationsEnabled: true,
          autoAssignEnquiries: true,
          officeStartTime: '09:30',
          officeEndTime: '18:30',
          breakStartTime: '13:00',
          breakEndTime: '14:00',
          gracePeriodMins: 15,
          workingDays: '1,2,3,4,5',
          halfDayHours: 4.5,
          fullDayMinHours: 8.0,
          overtimeMinHours: 9.5,
        }
      });
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('getSystemSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system settings' });
  }
};

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const updateSystemSettings = async (req: Request, res: Response) => {
  try {
    const { 
      companyName, supportEmail, supportPhone, whatsappNumber, currency, timezone, 
      notificationsEnabled, autoAssignEnquiries,
      officeStartTime, officeEndTime, breakStartTime, breakEndTime,
      gracePeriodMins, workingDays, halfDayHours, fullDayMinHours, overtimeMinHours
    } = req.body;

    // Validate times if provided
    if (officeStartTime !== undefined && !timeRegex.test(officeStartTime)) {
      return res.status(400).json({ success: false, message: 'Invalid office start time format. Use HH:mm (24-hour, e.g. 09:30).' });
    }
    if (officeEndTime !== undefined && !timeRegex.test(officeEndTime)) {
      return res.status(400).json({ success: false, message: 'Invalid office end time format. Use HH:mm (24-hour, e.g. 18:30).' });
    }
    if (breakStartTime !== undefined && breakStartTime !== null && breakStartTime !== '' && !timeRegex.test(breakStartTime)) {
      return res.status(400).json({ success: false, message: 'Invalid break start time format. Use HH:mm (24-hour).' });
    }
    if (breakEndTime !== undefined && breakEndTime !== null && breakEndTime !== '' && !timeRegex.test(breakEndTime)) {
      return res.status(400).json({ success: false, message: 'Invalid break end time format. Use HH:mm (24-hour).' });
    }

    if (officeStartTime && officeEndTime) {
      const [startH, startM] = officeStartTime.split(':').map(Number);
      const [endH, endM] = officeEndTime.split(':').map(Number);
      if (endH * 60 + endM <= startH * 60 + startM) {
        return res.status(400).json({ success: false, message: 'Office end time must be after office start time.' });
      }
    }

    if (breakStartTime && breakEndTime) {
      const [bStartH, bStartM] = breakStartTime.split(':').map(Number);
      const [bEndH, bEndM] = breakEndTime.split(':').map(Number);
      if (bEndH * 60 + bEndM <= bStartH * 60 + bStartM) {
        return res.status(400).json({ success: false, message: 'Break end time must be after break start time.' });
      }
    }

    if (gracePeriodMins !== undefined && (isNaN(Number(gracePeriodMins)) || Number(gracePeriodMins) < 0 || Number(gracePeriodMins) > 180)) {
      return res.status(400).json({ success: false, message: 'Grace period must be a valid number between 0 and 180 minutes.' });
    }

    if (halfDayHours !== undefined && (isNaN(Number(halfDayHours)) || Number(halfDayHours) <= 0 || Number(halfDayHours) > 12)) {
      return res.status(400).json({ success: false, message: 'Half-day threshold hours must be between 1 and 12.' });
    }

    if (fullDayMinHours !== undefined && (isNaN(Number(fullDayMinHours)) || Number(fullDayMinHours) <= 0 || Number(fullDayMinHours) > 24)) {
      return res.status(400).json({ success: false, message: 'Full-day minimum hours must be between 1 and 24.' });
    }

    if (overtimeMinHours !== undefined && (isNaN(Number(overtimeMinHours)) || Number(overtimeMinHours) < 0 || Number(overtimeMinHours) > 24)) {
      return res.status(400).json({ success: false, message: 'Overtime threshold hours must be between 0 and 24.' });
    }

    const updatedSettings = await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: {
        ...(companyName !== undefined && { companyName }),
        ...(supportEmail !== undefined && { supportEmail }),
        ...(supportPhone !== undefined && { supportPhone }),
        ...(whatsappNumber !== undefined && { whatsappNumber }),
        ...(currency !== undefined && { currency }),
        ...(timezone !== undefined && { timezone }),
        ...(notificationsEnabled !== undefined && { notificationsEnabled: Boolean(notificationsEnabled) }),
        ...(autoAssignEnquiries !== undefined && { autoAssignEnquiries: Boolean(autoAssignEnquiries) }),
        ...(officeStartTime !== undefined && { officeStartTime }),
        ...(officeEndTime !== undefined && { officeEndTime }),
        ...(breakStartTime !== undefined && { breakStartTime: breakStartTime || null }),
        ...(breakEndTime !== undefined && { breakEndTime: breakEndTime || null }),
        ...(gracePeriodMins !== undefined && { gracePeriodMins: Number(gracePeriodMins) }),
        ...(workingDays !== undefined && { workingDays: String(workingDays) }),
        ...(halfDayHours !== undefined && { halfDayHours: Number(halfDayHours) }),
        ...(fullDayMinHours !== undefined && { fullDayMinHours: Number(fullDayMinHours) }),
        ...(overtimeMinHours !== undefined && { overtimeMinHours: Number(overtimeMinHours) }),
      },
      create: {
        id: 'default',
        companyName: companyName || 'Universal Travel Company',
        supportEmail: supportEmail || 'support@utctravel.com',
        supportPhone: supportPhone || '+1 (800) 555-UTC1',
        whatsappNumber: whatsappNumber || null,
        currency: currency || 'USD',
        timezone: timezone || 'UTC+03:00',
        notificationsEnabled: notificationsEnabled !== undefined ? Boolean(notificationsEnabled) : true,
        autoAssignEnquiries: autoAssignEnquiries !== undefined ? Boolean(autoAssignEnquiries) : true,
        officeStartTime: officeStartTime || '09:30',
        officeEndTime: officeEndTime || '18:30',
        breakStartTime: breakStartTime || '13:00',
        breakEndTime: breakEndTime || '14:00',
        gracePeriodMins: gracePeriodMins !== undefined ? Number(gracePeriodMins) : 15,
        workingDays: workingDays || '1,2,3,4,5',
        halfDayHours: halfDayHours !== undefined ? Number(halfDayHours) : 4.5,
        fullDayMinHours: fullDayMinHours !== undefined ? Number(fullDayMinHours) : 8.0,
        overtimeMinHours: overtimeMinHours !== undefined ? Number(overtimeMinHours) : 9.5,
      }
    });

    res.status(200).json({ success: true, data: updatedSettings, message: 'System settings updated successfully' });
  } catch (error) {
    console.error('updateSystemSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update system settings' });
  }
};

const SEED_COORDS: Record<string, { lat: number; lng: number }> = {
  'sri-lanka': { lat: 7.8731, lng: 80.7718 },
  'maldives': { lat: 3.2028, lng: 73.2207 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'bali': { lat: -8.4095, lng: 115.1889 },
  'swiss-alps': { lat: 46.8182, lng: 8.2275 },
  'paris': { lat: 48.8566, lng: 2.3522 }
};

export const getHomepageContent = async (req: Request, res: Response) => {
  try {
    let content = await prisma.homepageContent.findUnique({
      where: { id: 'default' }
    });

    const systemSettings = await prisma.systemSettings.findUnique({
      where: { id: 'default' }
    });

    if (!content) {
      content = await prisma.homepageContent.create({
        data: { id: 'default' }
      });
    }

    // Fetch hero media items
    const heroMediaList = await prisma.homepageHeroMedia.findMany({
      orderBy: { displayOrder: 'asc' }
    });

    // Fetch destinations
    const destinations = await prisma.destination.findMany({
      include: {
        _count: { select: { packages: true } }
      },
      orderBy: { name: 'asc' }
    });

    // Auto seed missing coordinates for smooth map rendering
    const formattedDestinations = await Promise.all(
      destinations.map(async (dest) => {
        let lat = dest.latitude;
        let lng = dest.longitude;

        if (!lat || !lng) {
          const matchKey = Object.keys(SEED_COORDS).find(k => dest.slug.includes(k) || dest.name.toLowerCase().includes(k));
          if (matchKey) {
            lat = SEED_COORDS[matchKey].lat;
            lng = SEED_COORDS[matchKey].lng;
          } else {
            lat = 7.0 + (dest.name.charCodeAt(0) % 30);
            lng = 75.0 + (dest.name.charCodeAt(dest.name.length - 1) % 40);
          }

          // Update in DB lazily
          await prisma.destination.update({
            where: { id: dest.id },
            data: { latitude: lat, longitude: lng }
          }).catch(() => { });
        }

        return {
          ...dest,
          latitude: lat,
          longitude: lng,
          packageCount: dest._count.packages
        };
      })
    );

    const dyn = (content?.dynamicSections as any) || {};
    const loadingAnimationEnabled = dyn.loadingAnimationEnabled !== false;
    const enrichedContent = {
      ...content,
      loadingAnimationEnabled
    };

    res.status(200).json({
      success: true,
      data: {
        content: enrichedContent,
        heroMediaList,
        destinations: formattedDestinations,
        whatsappNumber: systemSettings?.whatsappNumber || null,
        supportPhone: systemSettings?.supportPhone || null
      }
    });
  } catch (error) {
    console.error('Get homepage content error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch homepage content' });
  }
};

export const updateHomepageContent = async (req: Request, res: Response) => {
  try {
    const {
      heroTitle,
      heroSubtitle,
      heroImage,
      heroActive,
      heroMediaType,
      heroVideoUrl,
      heroVideoActive,
      primaryCtaText,
      primaryCtaLink,
      secondaryCtaText,
      secondaryCtaLink,
      videoTitle,
      videoDescription,
      videoUrl,
      videoActive,
      mapTitle,
      mapSubtitle,
      mapActive,
      mapImage,
      dynamicSections,
      loadingAnimationEnabled
    } = req.body;

    const existing = await prisma.homepageContent.findUnique({ where: { id: 'default' } });
    const currentDynamic = (existing?.dynamicSections as Record<string, any>) || {};
    let finalDynamicSections: any = dynamicSections !== undefined ? { ...currentDynamic, ...dynamicSections } : currentDynamic;
    if (loadingAnimationEnabled !== undefined) {
      finalDynamicSections = {
        ...finalDynamicSections,
        loadingAnimationEnabled: Boolean(loadingAnimationEnabled)
      };
    }

    const updated = await prisma.homepageContent.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        ...(heroTitle !== undefined && { heroTitle }),
        ...(heroSubtitle !== undefined && { heroSubtitle }),
        ...(heroImage !== undefined && { heroImage }),
        ...(heroActive !== undefined && { heroActive: Boolean(heroActive) }),
        ...(heroMediaType !== undefined && { heroMediaType }),
        ...(heroVideoUrl !== undefined && { heroVideoUrl }),
        ...(heroVideoActive !== undefined && { heroVideoActive: Boolean(heroVideoActive) }),
        ...(primaryCtaText !== undefined && { primaryCtaText }),
        ...(primaryCtaLink !== undefined && { primaryCtaLink }),
        ...(secondaryCtaText !== undefined && { secondaryCtaText }),
        ...(secondaryCtaLink !== undefined && { secondaryCtaLink }),
        ...(videoTitle !== undefined && { videoTitle }),
        ...(videoDescription !== undefined && { videoDescription }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(videoActive !== undefined && { videoActive: Boolean(videoActive) }),
        ...(mapTitle !== undefined && { mapTitle }),
        ...(mapSubtitle !== undefined && { mapSubtitle }),
        ...(mapActive !== undefined && { mapActive: Boolean(mapActive) }),
        ...(mapImage !== undefined && { mapImage }),
        dynamicSections: finalDynamicSections,
      },
      update: {
        ...(heroTitle !== undefined && { heroTitle }),
        ...(heroSubtitle !== undefined && { heroSubtitle }),
        ...(heroImage !== undefined && { heroImage }),
        ...(heroActive !== undefined && { heroActive: Boolean(heroActive) }),
        ...(heroMediaType !== undefined && { heroMediaType }),
        ...(heroVideoUrl !== undefined && { heroVideoUrl }),
        ...(heroVideoActive !== undefined && { heroVideoActive: Boolean(heroVideoActive) }),
        ...(primaryCtaText !== undefined && { primaryCtaText }),
        ...(primaryCtaLink !== undefined && { primaryCtaLink }),
        ...(secondaryCtaText !== undefined && { secondaryCtaText }),
        ...(secondaryCtaLink !== undefined && { secondaryCtaLink }),
        ...(videoTitle !== undefined && { videoTitle }),
        ...(videoDescription !== undefined && { videoDescription }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(videoActive !== undefined && { videoActive: Boolean(videoActive) }),
        ...(mapTitle !== undefined && { mapTitle }),
        ...(mapSubtitle !== undefined && { mapSubtitle }),
        ...(mapActive !== undefined && { mapActive: Boolean(mapActive) }),
        ...(mapImage !== undefined && { mapImage }),
        dynamicSections: finalDynamicSections,
      }
    });

    res.status(200).json({ success: true, data: updated, message: 'Homepage content updated successfully' });
  } catch (error) {
    console.error('Update homepage content error:', error);
    res.status(500).json({ success: false, message: 'Failed to update homepage content' });
  }
};

// Hero Media Items CRUD
export const createHeroMedia = async (req: Request, res: Response) => {
  try {
    const { title, mediaType, url, displayOrder, isActive } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'Media URL is required' });

    const created = await prisma.homepageHeroMedia.create({
      data: {
        title: title || '',
        mediaType: mediaType || 'IMAGE',
        url,
        displayOrder: Number(displayOrder) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });

    res.status(201).json({ success: true, data: created, message: 'Hero media added successfully' });
  } catch (error) {
    console.error('Create hero media error:', error);
    res.status(500).json({ success: false, message: 'Failed to create hero media' });
  }
};

export const updateHeroMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, mediaType, url, displayOrder, isActive } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (mediaType !== undefined) updateData.mediaType = mediaType;
    if (url !== undefined) updateData.url = url;
    if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.homepageHeroMedia.update({
      where: { id: id as string },
      data: updateData
    });

    res.status(200).json({ success: true, data: updated, message: 'Hero media updated' });
  } catch (error) {
    console.error('Update hero media error:', error);
    res.status(400).json({ success: false, message: 'Failed to update hero media' });
  }
};

export const deleteHeroMedia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.homepageHeroMedia.delete({
      where: { id: id as string }
    });

    res.status(200).json({ success: true, message: 'Hero media deleted successfully' });
  } catch (error) {
    console.error('Delete hero media error:', error);
    res.status(400).json({ success: false, message: 'Failed to delete hero media' });
  }
};

export const updateDestinationCoordinates = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, tagline, image, isActive } = req.body;

    const updateData: any = {};
    if (name) {
      updateData.name = name;
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    if (latitude !== undefined) updateData.latitude = latitude === '' ? null : Number(latitude);
    if (longitude !== undefined) updateData.longitude = longitude === '' ? null : Number(longitude);
    if (tagline !== undefined) updateData.tagline = tagline;
    if (image !== undefined) updateData.image = image;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.destination.update({
      where: { id: id as string },
      data: updateData
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Update destination coordinates error:', error);
    res.status(400).json({ success: false, message: 'Failed to update destination coordinates' });
  }
};

export const createDestination = async (req: Request, res: Response) => {
  try {
    const { name, latitude, longitude } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Destination Name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const existing = await prisma.destination.findUnique({ where: { slug } });
    if (existing) return res.status(400).json({ success: false, message: 'Destination already exists' });

    const destination = await prisma.destination.create({
      data: {
        name,
        slug,
        latitude: latitude === '' || latitude === undefined ? null : Number(latitude),
        longitude: longitude === '' || longitude === undefined ? null : Number(longitude),
      }
    });
    res.status(201).json({ success: true, data: destination });
  } catch (error) {
    console.error('Create destination error:', error);
    res.status(500).json({ success: false, message: 'Failed to create destination' });
  }
};

export const deleteDestination = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dest = await prisma.destination.findUnique({
      where: { id: String(id) },
      include: { packages: { select: { id: true } } }
    });

    if (!dest) {
      return res.status(404).json({ success: false, message: 'Destination not found' });
    }

    if (dest.packages.length > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete destination. It is used by ${dest.packages.length} package(s).` });
    }

    await prisma.destination.delete({ where: { id: String(id) } });
    res.status(200).json({ success: true, message: 'Destination deleted successfully' });
  } catch (error) {
    console.error('Delete destination error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete destination' });
  }
};

export const getPackagesPageContent = async (req: Request, res: Response) => {
  try {
    let content = await prisma.packagesPageContent.findUnique({
      where: { id: 'default' }
    });

    if (!content) {
      content = await prisma.packagesPageContent.create({
        data: {
          id: 'default',
          heroTitle: 'Into The Heart of Ceylon',
          heroSubtitle: 'Tea trails, scenic train journeys, wildlife safaris and coastal charm across Sri Lanka.',
          heroImage: 'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=1600&auto=format&fit=crop',
          heroActive: true,
          dynamicSections: {
            heroMediaType: 'IMAGE',
            heroVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            primaryCtaText: 'Plan My Trip',
            primaryCtaLink: '#date-selection',
            secondaryCtaText: 'Customise This Journey',
            secondaryCtaLink: '#date-selection',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            mapActive: true,
            mapImage: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=1200'
          }
        }
      });
    }

    const dynamic = (content.dynamicSections as any) || {};
    const formatted = {
      ...content,
      heroMediaType: dynamic.heroMediaType || 'IMAGE',
      heroVideoUrl: dynamic.heroVideoUrl || null,
      primaryCtaText: dynamic.primaryCtaText || 'Plan My Trip',
      primaryCtaLink: dynamic.primaryCtaLink || '#date-selection',
      secondaryCtaText: dynamic.secondaryCtaText || 'Customise This Journey',
      secondaryCtaLink: dynamic.secondaryCtaLink || '#date-selection',
      videoUrl: dynamic.videoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      mapActive: dynamic.mapActive !== undefined ? dynamic.mapActive : true,
      mapImage: dynamic.mapImage || null,
    };

    res.status(200).json({ success: true, data: { content: formatted } });
  } catch (error) {
    console.error('getPackagesPageContent error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch packages page content' });
  }
};

export const updatePackagesPageContent = async (req: Request, res: Response) => {
  try {
    const {
      heroTitle,
      heroSubtitle,
      heroImage,
      heroActive,
      heroMediaType,
      heroVideoUrl,
      primaryCtaText,
      primaryCtaLink,
      secondaryCtaText,
      secondaryCtaLink,
      videoUrl,
      mapActive,
      mapImage,
      dynamicSections
    } = req.body;

    const existing = await prisma.packagesPageContent.findUnique({ where: { id: 'default' } });
    const existingDynamic = (existing?.dynamicSections as any) || {};

    const updatedDynamic = {
      ...existingDynamic,
      ...(dynamicSections || {}),
      ...(heroMediaType !== undefined && { heroMediaType }),
      ...(heroVideoUrl !== undefined && { heroVideoUrl }),
      ...(primaryCtaText !== undefined && { primaryCtaText }),
      ...(primaryCtaLink !== undefined && { primaryCtaLink }),
      ...(secondaryCtaText !== undefined && { secondaryCtaText }),
      ...(secondaryCtaLink !== undefined && { secondaryCtaLink }),
      ...(videoUrl !== undefined && { videoUrl }),
      ...(mapActive !== undefined && { mapActive: Boolean(mapActive) }),
      ...(mapImage !== undefined && { mapImage }),
    };

    const updated = await prisma.packagesPageContent.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        heroTitle: heroTitle || 'Into The Heart of Ceylon',
        heroSubtitle: heroSubtitle || 'Tea trails, scenic train journeys, wildlife safaris and coastal charm across Sri Lanka.',
        heroImage: heroImage || 'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=1600&auto=format&fit=crop',
        heroActive: heroActive !== undefined ? Boolean(heroActive) : true,
        dynamicSections: updatedDynamic
      },
      update: {
        ...(heroTitle !== undefined && { heroTitle }),
        ...(heroSubtitle !== undefined && { heroSubtitle }),
        ...(heroImage !== undefined && { heroImage }),
        ...(heroActive !== undefined && { heroActive: Boolean(heroActive) }),
        dynamicSections: updatedDynamic
      }
    });

    const formatted = {
      ...updated,
      ...updatedDynamic
    };

    res.status(200).json({ success: true, data: { content: formatted }, message: 'Packages page content updated successfully' });
  } catch (error) {
    console.error('updatePackagesPageContent error:', error);
    res.status(500).json({ success: false, message: 'Failed to update packages page content' });
  }
};


export const getFooterContent = async (req: Request, res: Response) => {
  try {
    // TS check

    let content = await prisma.footerContent.findUnique({ where: { id: 'default' } });
    if (!content) {
      content = await prisma.footerContent.create({ data: { id: 'default' } });
    }
    res.status(200).json({ success: true, data: content });
  } catch (error) {
    console.error('getFooterContent error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch footer content' });
  }
};

export const updateFooterContent = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    const updated = await prisma.footerContent.upsert({
      where: { id: 'default' },
      update: {
        companyBio: data.companyBio,
        logoText: data.logoText,
        logoSubtext: data.logoSubtext,
        address: data.address,
        supportPhone: data.supportPhone,
        whatsappNumber: data.whatsappNumber,
        supportEmail: data.supportEmail,
        facebookUrl: data.facebookUrl,
        instagramUrl: data.instagramUrl,
        youtubeUrl: data.youtubeUrl,
        twitterUrl: data.twitterUrl,
        linkedinUrl: data.linkedinUrl,
        copyrightText: data.copyrightText,
        navColumns: data.navColumns
      },
      create: {
        id: 'default',
        companyBio: data.companyBio,
        logoText: data.logoText,
        logoSubtext: data.logoSubtext,
        address: data.address,
        supportPhone: data.supportPhone,
        whatsappNumber: data.whatsappNumber,
        supportEmail: data.supportEmail,
        facebookUrl: data.facebookUrl,
        instagramUrl: data.instagramUrl,
        youtubeUrl: data.youtubeUrl,
        twitterUrl: data.twitterUrl,
        linkedinUrl: data.linkedinUrl,
        copyrightText: data.copyrightText,
        navColumns: data.navColumns
      }
    });

    res.status(200).json({ success: true, data: updated, message: 'Footer content updated successfully' });
  } catch (error) {
    console.error('updateFooterContent error:', error);
    res.status(500).json({ success: false, message: 'Failed to update footer content' });
  }
};
