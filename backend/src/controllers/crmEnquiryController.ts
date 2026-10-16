import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const submitEnquirySchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone number is required'),
  whatsappNumber: z.string().optional(),
  source: z.string().optional(),
  packageId: z.string().optional(),
  packageName: z.string().optional(),
  packageTier: z.string().optional(), // 'Essential' | 'Signature' | 'Elite'
  packagePrice: z.number().optional(),
  perAdultPrice: z.number().optional(),
  perChild6to11Price: z.number().optional(),
  perChild2to5Price: z.number().optional(),
  infantPrice: z.number().optional(),
  singleSupplementPrice: z.number().optional(),
  adultCount: z.number().int().min(0).optional(),
  child6to11Count: z.number().int().min(0).optional(),
  child2to5Count: z.number().int().min(0).optional(),
  childCount: z.number().int().min(0).optional(),
  infantCount: z.number().int().min(0).optional(),
  isSingleSupplement: z.boolean().optional(),
  travelDate: z.string().optional(),
  travellerCount: z.number().int().positive().optional(),
  calculatedTotalAmount: z.number().optional(),
  paymentStatus: z.string().optional(),
  destination: z.string().optional(),
  budgetRange: z.string().optional(),
  preferredContact: z.string().optional(),
  message: z.string().optional(),
  specialRequests: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'FOLLOW_UP', 'REQUIREMENT_COLLECTION', 'QUOTATION_PREPARATION', 'QUOTATION_SENT', 'CONVERTED', 'NOT_INTERESTED', 'LOST', 'CLOSED']),
  remarks: z.string().optional(),
});

const addNoteSchema = z.object({
  text: z.string().min(1, 'Note cannot be empty'),
});

const scheduleFollowUpSchema = z.object({
  type: z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'OTHER']),
  notes: z.string().optional(),
  scheduledFor: z.string().min(1, 'Scheduled date & time is required'),
  employeeId: z.string().optional(),
});

const updateFollowUpSchema = z.object({
  type: z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'OTHER']).optional(),
  notes: z.string().optional(),
  scheduledFor: z.string().optional(),
  employeeId: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
});

// Package Tier Rates Definition Matrix (Fallback)
const TIER_PRICING: Record<string, {
  name: string;
  basePrice: number;
  perAdult: number;
  perChild6to11: number;
  perChild2to5: number;
  infant: number;
  singleSupp: number;
}> = {
  essential: { name: 'Essential', basePrice: 39999, perAdult: 32999, perChild6to11: 32999, perChild2to5: 22999, infant: 6999, singleSupp: 12999 },
  signature: { name: 'Signature', basePrice: 59999, perAdult: 49999, perChild6to11: 34999, perChild2to5: 9999, infant: 9999, singleSupp: 14999 },
  elite: { name: 'Elite', basePrice: 79999, perAdult: 64999, perChild6to11: 44999, perChild2to5: 44999, infant: 11999, singleSupp: 15999 },
};

// ─── Constants: Status Mapping ──────────────────────────────────────────────────

const statusToStageMap: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  FOLLOW_UP: 'Contacted',
  REQUIREMENT_COLLECTION: 'Qualified',
  QUOTATION_PREPARATION: 'Proposal Sent',
  QUOTATION_SENT: 'Proposal Sent',
  CONVERTED: 'Won',
  NOT_INTERESTED: 'Lost',
  LOST: 'Lost',
  CLOSED: 'Lost',
};

// ─── Helper: Generate Reference Number ───────────────────────────────────────

function generateEnquiryRef(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ENQ-${year}-${random}`;
}

// ─── PUBLIC: Submit Enquiry ───────────────────────────────────────────────────

export async function submitEnquiry(req: Request, res: Response): Promise<void> {
  try {
    const data = submitEnquirySchema.parse(req.body);

    // 1. Find or create customer (de-duplicate by email)
    let customer = await prisma.customer.findUnique({ where: { email: data.email } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName || '',
          email: data.email,
          phone: data.phone,
          whatsappNumber: data.whatsappNumber || data.phone,
        },
      });
    } else if (data.phone && !customer.phone) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { phone: data.phone }
      });
    }

    // 2. Resolve Database Package Link EARLY to use in duplicate check
    let linkedPackageId = data.packageId;
    
    // Do not force a default package if this is a custom tour! 
    // Otherwise the CRM will show the default package's name instead of the user's custom destination.
    const isCustomTour = data.source === 'Website Custom Tour' || data.packageName === 'Custom Tour';
    
    if (!isCustomTour && (!linkedPackageId || linkedPackageId.length < 10)) {
      const dbPackage = await prisma.travelPackage.findFirst({
        where: { OR: [{ slug: 'swiss-alps-ski-adventure' }, { status: 'PUBLISHED' }] }
      });
      if (dbPackage) linkedPackageId = dbPackage.id;
    }

    // 3. Prevent Duplicate Submission within 2 minutes for the SAME package and date
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const existingRecentEnquiry = await prisma.enquiry.findFirst({
      where: {
        customerId: customer.id,
        packageId: linkedPackageId || null,
        travelDate: data.travelDate || 'Flexible',
        createdAt: { gte: twoMinutesAgo },
        source: data.source || 'Website Package Booking',
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingRecentEnquiry) {
      res.status(200).json({
        success: true,
        referenceNumber: existingRecentEnquiry.referenceNumber,
        message: 'Enquiry already received! Reference number: ' + existingRecentEnquiry.referenceNumber,
      });
      return;
    }

    // 4. Resolve Package Tier & Calculate Total Price (Decimal-Safe)
    const tierKey = (data.packageTier || 'Signature').toLowerCase();
    
    // Fetch dynamic pricing from DB, fallback to hardcoded if not found
    const dbTier = await prisma.tourPricingTier.findUnique({ where: { tierId: tierKey } });
    let tierInfo = TIER_PRICING[tierKey] || TIER_PRICING.signature;
    
    if (dbTier) {
      tierInfo = {
        name: dbTier.tierName,
        basePrice: dbTier.basePrice,
        perAdult: dbTier.adultPrice,
        perChild6to11: dbTier.child6to17, // Map to DB's child6to17
        perChild2to5: dbTier.child2to5,
        infant: dbTier.infantPrice,
        singleSupp: dbTier.singleSupplement
      };
    }

    const adultCnt = data.adultCount !== undefined ? data.adultCount : (data.travellerCount || 2);
    const child6to11Cnt = data.child6to11Count || 0;
    const child2to5Cnt = data.child2to5Count || 0;
    const infantCnt = data.infantCount || 0;
    const isSingleSupp = Boolean(data.isSingleSupplement) || (adultCnt === 1 && Boolean(data.isSingleSupplement));

    const adultRate = data.perAdultPrice ?? tierInfo.perAdult;
    const child6to11Rate = data.perChild6to11Price ?? tierInfo.perChild6to11;
    const child2to5Rate = data.perChild2to5Price ?? tierInfo.perChild2to5;
    const infantRate = data.infantPrice ?? tierInfo.infant;
    const singleSuppRate = data.singleSupplementPrice ?? tierInfo.singleSupp;

    const adultsTotal = adultCnt * adultRate;
    const child6to11Total = child6to11Cnt * child6to11Rate;
    const child2to5Total = child2to5Cnt * child2to5Rate;
    const infantsTotal = infantCnt * infantRate;
    const singleSuppTotal = isSingleSupp ? singleSuppRate : 0;

    const calculatedTotal = data.calculatedTotalAmount || (adultsTotal + child6to11Total + child2to5Total + infantsTotal + singleSuppTotal);
    const totalTravellers = adultCnt + child6to11Cnt + child2to5Cnt + infantCnt;

    // (Package link was already resolved above as linkedPackageId)

    // 5. Construct Detailed Notes & Line-Item Breakdown
    const detailedBreakdown = [
      isCustomTour ? `=== WEBSITE CUSTOM TOUR ENQUIRY ===` : `=== WEBSITE PACKAGE BOOKING BREAKDOWN ===`,
      isCustomTour ? `Destination: ${data.destination || 'General'}` : `Selected Package Tier: ${tierInfo.name} (Base Price: ₹${tierInfo.basePrice.toLocaleString()})`,
      `Expected Travel Date: ${data.travelDate || 'Flexible / To be confirmed'}`,
      `Payment Status: PENDING`,
      ``,
      `--- TRAVELLERS & PRICING BREAKDOWN ---`,
      `Adults (${adultCnt}): ${adultCnt} x ₹${adultRate.toLocaleString()} = ₹${adultsTotal.toLocaleString()}`,
      `Children 6-11 (${child6to11Cnt}): ${child6to11Cnt} x ₹${child6to11Rate.toLocaleString()} = ₹${child6to11Total.toLocaleString()}`,
      `Children 2-5 (${child2to5Cnt}): ${child2to5Cnt} x ₹${child2to5Rate.toLocaleString()} = ₹${child2to5Total.toLocaleString()}`,
      `Infants 0-2 (${infantCnt}): ${infantCnt} x ₹${infantRate.toLocaleString()} = ₹${infantsTotal.toLocaleString()}`,
      `Single Supplement: ${isSingleSupp ? `YES (+₹${singleSuppRate.toLocaleString()})` : 'NO'}`,
      ``,
      `CALCULATED TOTAL AMOUNT: ₹${calculatedTotal.toLocaleString()}`,
      data.specialRequests ? `Special Requests: ${data.specialRequests}` : ''
    ].filter(Boolean).join('\n');

    // 6. Generate Reference Number
    let referenceNumber = generateEnquiryRef();
    while (await prisma.enquiry.findUnique({ where: { referenceNumber } })) {
      referenceNumber = generateEnquiryRef();
    }

    const sourceTag = data.source || 'Website Package Booking';

    // 7. Create Enquiry Record in PostgreSQL
    const enquiry = await prisma.enquiry.create({
      data: {
        referenceNumber,
        source: sourceTag,
        status: 'NEW',
        customerId: customer.id,
        packageId: linkedPackageId || null,
        destination: data.destination || 'Sri Lanka',
        travelDate: data.travelDate || 'Flexible',
        travellerCount: totalTravellers,
        adultCount: adultCnt,
        childCount: child6to11Cnt + child2to5Cnt,
        budgetRange: `₹${calculatedTotal.toLocaleString()}`,
        message: detailedBreakdown,
        specialRequests: detailedBreakdown,
      },
      include: { customer: true, package: true },
    });

    // 8. Create corresponding CRM Sales Lead in "New" pipeline stage
    const pipelineStage = await prisma.salesPipelineStage.findFirst({
      where: { name: 'New' }
    });

    if (pipelineStage) {
      await prisma.salesLead.create({
        data: {
          title: isCustomTour 
            ? `Custom Tour: ${data.destination || 'General'} (${enquiry.referenceNumber})`
            : `Package Booking (${tierInfo.name}): ${enquiry.referenceNumber}`,
          source: sourceTag,
          status: 'NEW',
          expectedValue: calculatedTotal,
          currency: 'INR',
          customerId: customer.id,
          pipelineStageId: pipelineStage.id,
          enquiryId: enquiry.id
        }
      }).catch((e) => console.error('Sales lead creation warning:', e));
    }

    // 9. Status History Log
    await prisma.enquiryStatusHistory.create({
      data: {
        enquiryId: enquiry.id,
        oldStatus: null,
        newStatus: 'NEW',
        remarks: isCustomTour 
          ? `Submitted via website (Custom Tour: ${data.destination || 'General'})`
          : `Submitted via website (${tierInfo.name} Package)`,
      },
    });

    res.status(201).json({
      success: true,
      referenceNumber: enquiry.referenceNumber,
      message: isCustomTour 
        ? `Your custom tour enquiry for ${data.destination || 'General'} (Ref: ${enquiry.referenceNumber}) has been submitted successfully!`
        : `Your booking enquiry for ${tierInfo.name} Package (Ref: ${enquiry.referenceNumber}) has been submitted successfully!`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.issues });
      return;
    }
    console.error('Enquiry submission error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit enquiry. Please try again.' });
  }
}

// ─── CRM: List Enquiries ──────────────────────────────────────────────────────

export async function listEnquiries(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt((req.query.page as string) || '1') || 1;
    const limit = parseInt((req.query.limit as string) || '20') || 20;
    const status = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status as string | undefined;
    const source = Array.isArray(req.query.source) ? req.query.source[0] : req.query.source as string | undefined;
    const search = Array.isArray(req.query.search) ? req.query.search[0] : req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, enquiries] = await Promise.all([
      prisma.enquiry.count({ where }),
      prisma.enquiry.findMany({
        where,
        include: {
          customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
          package: { select: { title: true, slug: true } },
          assignments: {
            include: {
              employee: { select: { firstName: true, lastName: true } },
            },
          },
          followUps: {
            where: { status: 'PENDING' },
            orderBy: { scheduledFor: 'asc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      success: true,
      data: enquiries,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('List enquiries error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch enquiries.' });
  }
}

// ─── CRM: Get Enquiry Detail ──────────────────────────────────────────────────

export async function getEnquiryById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: id as string },
      include: {
        customer: true,
        package: { select: { title: true, slug: true, basePrice: true, currency: true } },
        assignments: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, designation: { select: { name: true } } } },
          },
        },
        notes: { orderBy: { createdAt: 'desc' } },
        followUps: { 
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { scheduledFor: 'asc' } 
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!enquiry) {
      res.status(404).json({ success: false, message: 'Enquiry not found.' });
      return;
    }

    res.json({ success: true, data: enquiry });
  } catch (error) {
    console.error('Get enquiry error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch enquiry.' });
  }
}

// ─── CRM: Update Status ───────────────────────────────────────────────────────

export async function updateEnquiryStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, remarks } = updateStatusSchema.parse(req.body);

    const existing = await prisma.enquiry.findUnique({ where: { id: id as string } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Enquiry not found.' });
      return;
    }

    const txOperations: any[] = [
      prisma.enquiry.update({ where: { id: id as string }, data: { status } }),
      prisma.enquiryStatusHistory.create({
        data: {
          enquiryId: id as string,
          oldStatus: existing.status,
          newStatus: status,
          updatedById: req.user?.userId ?? null,
          remarks: remarks ?? null,
        },
      }),
    ];

    const mappedStageName = statusToStageMap[status];

    if (mappedStageName) {
      const existingLead = await prisma.salesLead.findUnique({
        where: { enquiryId: id as string }
      });

      const pipelineStage = await prisma.salesPipelineStage.findFirst({
        where: { name: mappedStageName }
      });

      if (pipelineStage) {
        if (!existingLead) {
          // Lead doesn't exist yet, create it and map it to the stage
          txOperations.push(
            prisma.salesLead.create({
              data: {
                title: `Enquiry: ${existing.referenceNumber}`,
                source: existing.source || 'Website',
                status: 'NEW',
                customerId: existing.customerId,
                pipelineStageId: pipelineStage.id,
                enquiryId: id as string
              }
            })
          );
        } else {
          // Lead exists, just update its pipeline stage
          txOperations.push(
            prisma.salesLead.update({
              where: { id: existingLead.id },
              data: { pipelineStageId: pipelineStage.id }
            })
          );
        }
      }
    }

    await prisma.$transaction(txOperations);

    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.issues });
      return;
    }
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
}

// ─── CRM: Add Internal Note ───────────────────────────────────────────────────

export async function addNote(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { text } = addNoteSchema.parse(req.body);
    const authorId = req.user?.userId ?? 'system';

    const note = await prisma.enquiryNote.create({
      data: { enquiryId: id as string, text, authorId },
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.issues });
      return;
    }
    console.error('Add note error:', error);
    res.status(500).json({ success: false, message: 'Failed to add note.' });
  }
}

// ─── CRM: Schedule Follow-up ──────────────────────────────────────────────────

export async function scheduleFollowUp(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const data = scheduleFollowUpSchema.parse(req.body);

    let assignedEmpId = data.employeeId;
    if (!assignedEmpId) {
      if (req.user?.userId) {
        const emp = await prisma.employee.findUnique({ where: { userId: req.user.userId } });
        if (emp) assignedEmpId = emp.id;
      }
      
      if (!assignedEmpId) {
        const assignment = await prisma.enquiryAssignment.findFirst({ where: { enquiryId: id } });
        if (assignment) assignedEmpId = assignment.employeeId;
      }

      if (!assignedEmpId) {
        const firstEmp = await prisma.employee.findFirst();
        if (firstEmp) assignedEmpId = firstEmp.id;
      }
    }

    if (!assignedEmpId) {
      res.status(400).json({ success: false, message: 'No valid employee found for assignment.' });
      return;
    }

    const followUp = await prisma.followUp.create({
      data: {
        enquiryId: id,
        type: data.type,
        notes: data.notes ?? null,
        scheduledFor: new Date(data.scheduledFor),
        employeeId: assignedEmpId,
        status: 'PENDING',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.status(201).json({ success: true, data: followUp });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.issues });
      return;
    }
    console.error('Schedule follow-up error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule follow-up.' });
  }
}

// ─── CRM: Update Follow-up ───────────────────────────────────────────────────

export async function updateFollowUp(req: Request, res: Response): Promise<void> {
  try {
    const followUpId = (req.params.followUpId || req.params.id) as string;
    const data = updateFollowUpSchema.parse(req.body);

    const existing = await prisma.followUp.findUnique({ where: { id: followUpId } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Follow-up not found.' });
      return;
    }

    const updateData: any = {};
    if (data.type) updateData.type = data.type;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.scheduledFor) updateData.scheduledFor = new Date(data.scheduledFor);
    if (data.employeeId) updateData.employeeId = data.employeeId;
    if (data.status) updateData.status = data.status;

    const updated = await prisma.followUp.update({
      where: { id: followUpId },
      data: updateData,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json({ success: true, data: updated, message: 'Follow-up updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.issues });
      return;
    }
    console.error('Update follow-up error:', error);
    res.status(500).json({ success: false, message: 'Failed to update follow-up.' });
  }
}

// ─── CRM: Dashboard Stats ─────────────────────────────────────────────────────

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const [total, newEnquiries, pendingFollowUps, converted] = await Promise.all([
      prisma.enquiry.count(),
      prisma.enquiry.count({ where: { status: 'NEW' } }),
      prisma.followUp.count({
        where: {
          status: 'PENDING',
          scheduledFor: { lte: new Date() },
          enquiryId: { not: null },
          enquiry: { isNot: null }
        }
      }),
      prisma.enquiry.count({ where: { status: 'CONVERTED' } }),
    ]);

    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      data: { total, newEnquiries, pendingFollowUps, converted, conversionRate },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
}

// ─── CRM: Delete Enquiry ───────────────────────────────────────────────────────

export async function deleteEnquiry(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.enquiry.findUnique({
      where: { id: id as string },
      include: {
        salesLead: true,
        groupTourBookings: true,
      },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Enquiry not found.' });
      return;
    }

    const txOperations: any[] = [];

    // 1. Unlink SalesLead if attached (prevent foreign key constraint error while keeping SalesLead)
    if (existing.salesLead) {
      txOperations.push(
        prisma.salesLead.update({
          where: { id: existing.salesLead.id },
          data: { enquiryId: null },
        })
      );
    }

    // 2. Unlink GroupTourBookings if attached
    if (existing.groupTourBookings && existing.groupTourBookings.length > 0) {
      txOperations.push(
        prisma.groupTourBooking.updateMany({
          where: { enquiryId: id as string },
          data: { enquiryId: null },
        })
      );
    }

    // 3. Delete the enquiry (cascades FollowUp, EnquiryNote, EnquiryAssignment, EnquiryStatusHistory safely)
    txOperations.push(
      prisma.enquiry.delete({
        where: { id: id as string },
      })
    );

    await prisma.$transaction(txOperations);

    res.json({
      success: true,
      message: 'Enquiry deleted successfully.',
    });
  } catch (error) {
    console.error('Delete enquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete enquiry. Please try again.',
    });
  }
}

