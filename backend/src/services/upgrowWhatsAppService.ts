import prisma from '../utils/prisma';

// Upgrow Sales Flow / UpGrow Connect WhatsApp API Configuration
const UPGROW_API_BASE = process.env.UPGROW_WHATSAPP_API_BASE || 'https://wa.upgrowsalesflow.com/api/v1';
const UPGROW_MESSAGES_ENDPOINT = process.env.UPGROW_WHATSAPP_MESSAGES_ENDPOINT || `${UPGROW_API_BASE}/messages.php`;

/**
 * Get the securely configured Upgrow WhatsApp API Key from environment variables.
 * Never exposed to frontend or logged.
 */
export function getUpgrowApiKey(): string | null {
  const key = process.env.UPGROW_WHATSAPP_API_KEY || process.env.UPGROW_API_KEY || null;
  return key ? key.trim() : null;
}

/**
 * Send an outbound WhatsApp message via Upgrow Sales Flow API
 */
export async function sendUpgrowWhatsAppMessage(options: {
  to: string;
  text?: string;
  message?: string;
  type?: 'text' | 'template' | 'media';
  templateName?: string;
  mediaUrl?: string;
  enquiryId?: string;
  customerId?: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  status: string;
  error?: string;
}> {
  const apiKey = getUpgrowApiKey();
  const recipient = options.to.replace(/\D/g, '');
  const messageBody = options.text || options.message || '';

  if (!apiKey) {
    console.warn('[Upgrow WhatsApp] UPGROW_WHATSAPP_API_KEY is not configured in backend environment variables.');
    return {
      success: false,
      status: 'FAILED',
      error: 'Upgrow WhatsApp API key is not configured in backend environment variables.'
    };
  }

  if (!recipient) {
    return {
      success: false,
      status: 'FAILED',
      error: 'Invalid or missing recipient phone number.'
    };
  }

  // Construct payload adhering to standard Upgrow Connect parameters
  const payload: any = {
    phone: recipient,
    message: messageBody,
    type: options.type || (options.templateName ? 'template' : 'text'),
  };

  if (options.templateName) {
    payload.template_name = options.templateName;
  }
  if (options.mediaUrl) {
    payload.media_url = options.mediaUrl;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(UPGROW_MESSAGES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const resData: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = resData?.error?.message || resData?.message || `HTTP ${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    const externalId = resData.message_id || resData.messageId || resData.id || `upgrow_${Date.now()}`;

    // Record outbound message in database
    await prisma.metaMessage.create({
      data: {
        platform: 'WHATSAPP',
        externalId,
        senderId: 'UPGROW_GATEWAY',
        recipientId: recipient,
        direction: 'OUTBOUND',
        type: options.type === 'template' ? 'TEMPLATE' : 'TEXT',
        content: messageBody || (options.templateName ? `Template: ${options.templateName}` : ''),
        templateName: options.templateName,
        status: 'SENT',
        enquiryId: options.enquiryId || null,
        customerId: options.customerId || null,
        rawPayload: resData,
      }
    }).catch(err => {
      console.warn('[Upgrow WhatsApp] Failed to save outbound message record:', err.message);
    });

    return {
      success: true,
      messageId: externalId,
      status: 'SENT',
    };
  } catch (err: any) {
    const errorDetail = err?.message || 'Failed to dispatch WhatsApp message via Upgrow Sales Flow';
    console.error('[Upgrow WhatsApp] Dispatch error:', errorDetail);

    // Save failed attempt in database if enquiryId or customerId is provided
    if (options.enquiryId || options.customerId) {
      await prisma.metaMessage.create({
        data: {
          platform: 'WHATSAPP',
          externalId: `failed_${Date.now()}`,
          senderId: 'UPGROW_GATEWAY',
          recipientId: recipient,
          direction: 'OUTBOUND',
          type: 'TEXT',
          content: messageBody,
          status: 'FAILED',
          errorMessage: errorDetail,
          enquiryId: options.enquiryId || null,
          customerId: options.customerId || null,
        }
      }).catch(() => {});
    }

    return {
      success: false,
      status: 'FAILED',
      error: errorDetail,
    };
  }
}
