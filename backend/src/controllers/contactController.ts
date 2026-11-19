import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { contactEnquirySchema } from '../validators/contactValidator';
import { z } from 'zod';
import { assignLeadAutomatically } from '../services/leadAssignmentService';
import { resolveDefaultPipelineStageId } from '../services/pipelineStageService';

export const submitEnquiry = async (req: Request, res: Response) => {
  try {
    const data = contactEnquirySchema.parse(req.body);
    
    // ContactEnquiry is the simple website contact form model
    const enquiry = await prisma.contactEnquiry.create({
      data
    });

    // Create the corresponding CRM SalesLead and assign via existing Round Robin.
    // Failures here must never break the public form submission.
    try {
      const marker = `[CE:${enquiry.id}]`;
      const existingLead = await prisma.salesLead.findFirst({
        where: { title: { contains: marker } },
        select: { id: true }
      });

      if (!existingLead) {
        const email = data.email.trim().toLowerCase();
        let customer = await prisma.customer.findUnique({ where: { email } });
        if (!customer) {
          const parts = data.name.trim().split(/\s+/);
          customer = await prisma.customer.create({
            data: {
              firstName: parts[0],
              lastName: parts.slice(1).join(' '),
              email,
              phone: data.phone || null,
              whatsappNumber: data.phone || null
            }
          });
        }

        const stageId = await resolveDefaultPipelineStageId();
        const lead = await prisma.salesLead.create({
          data: {
            title: `Contact Us: ${data.subject} ${marker}`,
            source: 'Contact Form',
            status: 'NEW',
            customerId: customer.id,
            pipelineStageId: stageId
          }
        });

        await assignLeadAutomatically(lead.id).catch((e) => {
          console.error('Contact lead auto-assignment warning:', e);
        });
      }
    } catch (leadErr) {
      console.error('Contact form lead creation warning:', leadErr);
    }
    
    res.status(201).json({ message: 'Enquiry submitted successfully', id: enquiry.id });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.issues });
    }
    res.status(500).json({ error: 'Failed to submit enquiry' });
  }
};

export const getEnquiries = async (req: Request, res: Response) => {
  try {
    const enquiries = await prisma.contactEnquiry.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(enquiries);
  } catch (error) {
    console.error('Fetch feedback enquiries error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback enquiries' });
  }
};

export const updateEnquiryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['NEW', 'READ', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await prisma.contactEnquiry.update({
      where: { id: String(id) },
      data: { status }
    });
    
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update feedback enquiry status error:', error);
    res.status(500).json({ error: 'Failed to update feedback enquiry status' });
  }
};

export const deleteEnquiry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.contactEnquiry.delete({ where: { id: String(id) } });
    res.status(200).json({ message: 'Enquiry deleted successfully' });
  } catch (error) {
    console.error('Delete feedback enquiry error:', error);
    res.status(500).json({ error: 'Failed to delete feedback enquiry' });
  }
};
