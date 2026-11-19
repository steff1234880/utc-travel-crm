import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { assignLeadAutomatically } from '../services/leadAssignmentService';
import { resolveDefaultPipelineStageId } from '../services/pipelineStageService';
import { sendUpgrowWhatsAppMessage, getUpgrowApiKey } from '../services/upgrowWhatsAppService';
import { checkAndRecordProcessedEvent } from '../services/metaService';

// Expected verification secret if configured by admin for Upgrow webhook
const UPGROW_WEBHOOK_SECRET = process.env.UPGROW_WEBHOOK_SECRET || process.env.META_VERIFY_TOKEN || 'utc_upgrow_webhook_secret_2026';

/**
 * 1. GET /api/upgrow/whatsapp/webhook - Webhook Verification / Challenge Handshake
 */
export async function verifyUpgrowWebhookController(req: Request, res: Response): Promise<void> {
  try {
    const token = req.query['token'] || req.query['verify_token'] || req.query['hub.verify_token'];
    const challenge = req.query['challenge'] || req.query['hub.challenge'];

    if (token && token === UPGROW_WEBHOOK_SECRET) {
      res.status(200).send(challenge || 'VERIFIED');
      return;
    }

    // Default friendly acknowledgment for webhook setup checkers
    res.status(200).json({
      status: 'UPGROW_WEBHOOK_READY',
      service: 'UTC Travel CRM WhatsApp Gateway',
      time: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Upgrow Webhook] Verification error:', error);
    res.sendStatus(500);
  }
}

/**
 * 2. POST /api/upgrow/whatsapp/webhook - Inbound WhatsApp Messages, Leads & Status Updates
 */
export async function handleUpgrowWebhookController(req: Request, res: Response): Promise<void> {
  // Acknowledge immediately to fulfill webhook 200 OK fast response contract and avoid timeouts/retries
  res.status(200).json({ received: true });

  try {
    const body = req.body;
    if (!body || typeof body !== 'object') return;

    // Optional secret verification via header or query parameter if configured
    const incomingSecret = req.headers['x-webhook-secret'] || req.headers['x-api-key'] || req.query['secret'];
    if (process.env.UPGROW_WEBHOOK_SECRET && incomingSecret && incomingSecret !== process.env.UPGROW_WEBHOOK_SECRET) {
      console.warn('[Upgrow Webhook] Rejected: Webhook secret mismatch.');
      return;
    }

    // ─── Case 1: Status Updates (sent, delivered, read, failed) ─────────────────
    const statusPayload = body.status || body.event === 'message_status' || body.event === 'status_update' || body.statuses;
    if (statusPayload) {
      const msgId = body.message_id || body.messageId || body.id || (Array.isArray(body.statuses) ? body.statuses[0]?.id : undefined);
      const rawStatus = (body.status || body.message_status || (Array.isArray(body.statuses) ? body.statuses[0]?.status : ''))?.toString().toUpperCase();
      
      if (msgId && rawStatus) {
        let normalizedStatus = 'SENT';
        if (rawStatus.includes('DELIVER') || rawStatus === 'DELIVERED') normalizedStatus = 'DELIVERED';
        else if (rawStatus.includes('READ') || rawStatus === 'SEEN') normalizedStatus = 'READ';
        else if (rawStatus.includes('FAIL') || rawStatus === 'ERROR') normalizedStatus = 'FAILED';

        await prisma.metaMessage.updateMany({
          where: { externalId: msgId },
          data: { status: normalizedStatus }
        }).catch(() => {});
        return;
      }
    }

    // ─── Case 2: Inbound Message / New Lead ───────────────────────────────────────
    // Extract sender phone, name, content, and external message ID from flexible payload schemas
    const leadData = body.lead || {};
    const messageData = body.message || {};

    const rawPhone: string = 
      body.phone || 
      body.sender || 
      body.from || 
      leadData.phone || 
      leadData.whatsapp || 
      messageData.from || 
      (Array.isArray(body.messages) ? body.messages[0]?.from : '') || '';

    const rawName: string = 
      body.name || 
      leadData.name || 
      leadData.full_name || 
      body.contact_name || 
      (body.contacts?.[0]?.profile?.name) || 
      '';

    const rawContent: string = 
      body.message?.text || 
      (typeof body.message === 'string' ? body.message : '') || 
      body.text || 
      body.content || 
      (Array.isArray(body.messages) ? body.messages[0]?.text?.body || body.messages[0]?.text : '') || 
      body.body || 
      '';

    const externalId: string = 
      body.message_id || 
      body.messageId || 
      messageData.message_id || 
      messageData.id || 
      (Array.isArray(body.messages) ? body.messages[0]?.id : '') || 
      body.id || 
      `upgrow_${Date.now()}`;

    if (!rawPhone) {
      // No sender phone number found in payload, skip processing
      return;
    }

    const normalizedPhone = rawPhone.replace(/\D/g, '');
    const phoneFormatted = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;

    // ─── 3. Deduplication Check ─────────────────────────────────────────────────
    const isNewEvent = await checkAndRecordProcessedEvent(
      externalId,
      'MESSAGE',
      `Upgrow WhatsApp ${externalId} from ${phoneFormatted}`
    );

    if (!isNewEvent) {
      console.log(`[Upgrow Webhook] Event ${externalId} already processed. Skipping duplicate.`);
      return;
    }

    // ─── 4. Customer Find or Create ─────────────────────────────────────────────
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { whatsappNumber: { contains: normalizedPhone.slice(-10) } },
          { phone: { contains: normalizedPhone.slice(-10) } }
        ]
      }
    });

    const parsedName = (rawName || 'WhatsApp Traveller').trim().split(' ');
    const firstName = parsedName[0] || 'WhatsApp';
    const lastName = parsedName.slice(1).join(' ') || 'Traveller';

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName,
          lastName,
          email: `${normalizedPhone}@whatsapp.utctravel.com`,
          phone: phoneFormatted,
          whatsappNumber: phoneFormatted,
        }
      });
    } else if (rawName && (customer.firstName === 'WhatsApp' || !customer.lastName)) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName,
          lastName,
        }
      }).catch(() => {});
    }

    // ─── 5. Enquiry Mapping & Deduplication ─────────────────────────────────────
    let enquiryId: string | undefined = undefined;

    // Check for an existing active enquiry for this customer
    const activeEnquiry = await prisma.enquiry.findFirst({
      where: {
        customerId: customer.id,
        status: { notIn: ['CLOSED', 'LOST', 'NOT_INTERESTED'] }
      },
      include: {
        assignments: true,
        salesLead: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    if (activeEnquiry) {
      enquiryId = activeEnquiry.id;

      // Self-healing: If the active enquiry has an unassigned or missing SalesLead, ensure it gets linked & assigned
      if (!activeEnquiry.salesLead) {
        const pipelineStageId = await resolveDefaultPipelineStageId();
        const createdLead = await prisma.salesLead.create({
          data: {
            title: `WhatsApp (Upgrow): ${activeEnquiry.destination || 'General'} (${activeEnquiry.referenceNumber})`,
            source: activeEnquiry.source || 'WhatsApp (Upgrow)',
            status: 'NEW',
            customerId: customer.id,
            pipelineStageId,
            enquiryId: activeEnquiry.id,
          }
        });
        await assignLeadAutomatically(createdLead.id).catch(err => {
          console.error('[Upgrow WhatsApp] Auto-assignment error on active lead:', err);
        });
      } else if (!activeEnquiry.salesLead.assignedToId || activeEnquiry.assignments.length === 0 || !activeEnquiry.salesLead.pipelineStageId) {
        if (!activeEnquiry.salesLead.pipelineStageId) {
          const defaultStageId = await resolveDefaultPipelineStageId();
          await prisma.salesLead.update({
            where: { id: activeEnquiry.salesLead.id },
            data: { pipelineStageId: defaultStageId }
          }).catch(() => {});
        }
        await assignLeadAutomatically(activeEnquiry.salesLead.id).catch(err => {
          console.error('[Upgrow WhatsApp] Auto-assignment error on unassigned lead:', err);
        });
      }
    } else {
      // Check 24-hour duplicate prevention for leads from same customer
      const recentEnquiry = await prisma.enquiry.findFirst({
        where: {
          customerId: customer.id,
          source: { contains: 'WhatsApp' },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        include: {
          assignments: true,
          salesLead: true,
        }
      });

      if (recentEnquiry) {
        enquiryId = recentEnquiry.id;

        // Self-healing: If the recent enquiry has an unassigned or missing SalesLead, ensure it gets assigned
        if (!recentEnquiry.salesLead) {
          const pipelineStageId = await resolveDefaultPipelineStageId();
          const createdLead = await prisma.salesLead.create({
            data: {
              title: `WhatsApp (Upgrow): ${recentEnquiry.destination || 'General'} (${recentEnquiry.referenceNumber})`,
              source: recentEnquiry.source || 'WhatsApp (Upgrow)',
              status: 'NEW',
              customerId: customer.id,
              pipelineStageId,
              enquiryId: recentEnquiry.id,
            }
          });
          await assignLeadAutomatically(createdLead.id).catch(err => {
            console.error('[Upgrow WhatsApp] Auto-assignment error on recent lead:', err);
          });
        } else if (!recentEnquiry.salesLead.assignedToId || recentEnquiry.assignments.length === 0 || !recentEnquiry.salesLead.pipelineStageId) {
          if (!recentEnquiry.salesLead.pipelineStageId) {
            const defaultStageId = await resolveDefaultPipelineStageId();
            await prisma.salesLead.update({
              where: { id: recentEnquiry.salesLead.id },
              data: { pipelineStageId: defaultStageId }
            }).catch(() => {});
          }
          await assignLeadAutomatically(recentEnquiry.salesLead.id).catch(err => {
            console.error('[Upgrow WhatsApp] Auto-assignment error on unassigned recent lead:', err);
          });
        }
      } else {
        // Generate Unique Reference Number
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let referenceNumber = 'ENQ-';
        for (let i = 0; i < 6; i++) {
          referenceNumber += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        while (await prisma.enquiry.findUnique({ where: { referenceNumber } })) {
          referenceNumber = 'ENQ-';
          for (let i = 0; i < 6; i++) {
            referenceNumber += chars.charAt(Math.floor(Math.random() * chars.length));
          }
        }

        const destination = leadData.destination || body.destination || 'General Enquiry';
        const sourceName = 'WhatsApp (Upgrow)';

        const newEnquiry = await prisma.enquiry.create({
          data: {
            referenceNumber,
            source: sourceName,
            status: 'NEW',
            customerId: customer.id,
            destination,
            message: rawContent || 'Incoming enquiry via Upgrow Sales Flow WhatsApp',
            preferredContact: 'WHATSAPP',
          }
        });

        enquiryId = newEnquiry.id;

        // Auto-create matching SalesLead in "New" pipeline stage
        const pipelineStageId = await resolveDefaultPipelineStageId();

        const salesLead = await prisma.salesLead.create({
          data: {
            title: `${sourceName}: ${destination} (${newEnquiry.referenceNumber})`,
            source: sourceName,
            status: 'NEW',
            customerId: customer.id,
            pipelineStageId,
            enquiryId: newEnquiry.id,
          }
        });

        // ─── 6. Strict Sequential Round-Robin Lead Assignment ────────────────────
        // Automatically selects next active Sales Executive and synchronizes EnquiryAssignment
        const assignResult = await assignLeadAutomatically(salesLead.id).catch((err) => {
          console.error('[Upgrow WhatsApp] Error in sequential round robin assignment:', err);
          return null;
        });

        if (assignResult?.assignedTo?.id) {
          const existingAssignment = await prisma.enquiryAssignment.findFirst({
            where: { enquiryId: newEnquiry.id, employeeId: assignResult.assignedTo.id }
          });
          if (!existingAssignment) {
            await prisma.enquiryAssignment.create({
              data: {
                enquiryId: newEnquiry.id,
                employeeId: assignResult.assignedTo.id,
              }
            }).catch(() => {});
          }
        }
      }
    }

    // ─── 7. Record Inbound Message in Conversation History ───────────────────────
    await prisma.metaMessage.create({
      data: {
        platform: 'WHATSAPP',
        externalId,
        senderId: normalizedPhone,
        senderName: rawName || `${customer.firstName} ${customer.lastName || ''}`.trim(),
        recipientId: body.recipient || body.to || 'UTC_WHATSAPP',
        direction: 'INBOUND',
        type: body.type ? String(body.type).toUpperCase() : 'TEXT',
        content: rawContent || '[WhatsApp Attachment/Media]',
        status: 'DELIVERED',
        customerId: customer.id,
        enquiryId: enquiryId || null,
        rawPayload: body,
      }
    });

  } catch (err: any) {
    console.error('[Upgrow Webhook] Handler error:', err);
  }
}

/**
 * 3. POST /api/upgrow/whatsapp/send - Secure Backend Outbound Dispatch
 * Accessible by authenticated CRM staff (Sales Executives, Managers, Admins)
 */
export async function sendUpgrowWhatsAppMessageController(req: Request, res: Response): Promise<void> {
  try {
    const { to, text, message, type, templateName, mediaUrl, enquiryId, customerId } = req.body;

    if (!to) {
      res.status(400).json({ success: false, message: 'Recipient phone number (to) is required.' });
      return;
    }

    const messageContent = text || message || '';
    if (!messageContent && !templateName && !mediaUrl) {
      res.status(400).json({ success: false, message: 'Message text, template, or media is required.' });
      return;
    }

    // Consent Validation
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (customer && (customer as any).marketingConsent === false) {
        res.status(400).json({
          success: false,
          message: 'Customer has opted out of messaging consent.'
        });
        return;
      }
    }

    const result = await sendUpgrowWhatsAppMessage({
      to,
      text: messageContent,
      type,
      templateName,
      mediaUrl,
      enquiryId,
      customerId,
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'WhatsApp message dispatched successfully via Upgrow Sales Flow.',
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to dispatch message via Upgrow Sales Flow.',
      });
    }
  } catch (err: any) {
    console.error('[Upgrow WhatsApp] send controller error:', err);
    res.status(500).json({ success: false, message: 'Internal server error while sending message.' });
  }
}

/**
 * 4. GET /api/upgrow/whatsapp/status - Check Upgrow Service Connection Status
 */
export async function getUpgrowStatusController(_req: Request, res: Response): Promise<void> {
  const apiKeyConfigured = Boolean(getUpgrowApiKey());
  res.status(200).json({
    success: true,
    data: {
      provider: 'Upgrow Sales Flow / UpGrow Connect',
      isConfigured: apiKeyConfigured,
      apiBase: 'https://wa.upgrowsalesflow.com/api/v1/',
      messageEndpoint: 'https://wa.upgrowsalesflow.com/api/v1/messages.php',
      webhookUrl: '/api/upgrow/whatsapp/webhook',
    }
  });
}

