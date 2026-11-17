import prisma from '../utils/prisma';
import { decryptToken, encryptToken, hashForCapi } from '../utils/metaCrypto';

export const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';
export const GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

export async function fetchJson(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<any> {
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw { response: { data, status: res.status } };
  }
  return data;
}

export interface MetaConfigDTO {
  id: string;
  appId?: string | null;
  appSecretSet: boolean;
  verifyToken?: string | null;
  pixelId?: string | null;
  capiAccessTokenSet: boolean;
  testEventCode?: string | null;
  isLive: boolean;
  autoSyncLeads: boolean;
  trackPixel: boolean;
  trackCapi: boolean;
  lastSyncAt?: string | null;
  webhookStatus: string;
  webhookLastError?: string | null;
}

/**
 * In-memory Mock Store fallback when PostgreSQL is unreachable or during initial setup
 */
let inMemoryConfig: any = {
  id: 'default',
  appId: process.env.META_APP_ID || '',
  appSecret: process.env.META_APP_SECRET ? encryptToken(process.env.META_APP_SECRET) : '',
  verifyToken: process.env.META_VERIFY_TOKEN || 'utc_travel_meta_verify_token_2026',
  pixelId: process.env.META_PIXEL_ID || '',
  capiAccessToken: process.env.META_CAPI_TOKEN ? encryptToken(process.env.META_CAPI_TOKEN) : '',
  testEventCode: '',
  isLive: false,
  autoSyncLeads: true,
  trackPixel: true,
  trackCapi: true,
  lastSyncAt: null,
  webhookStatus: 'INACTIVE',
  webhookLastError: null,
};

let inMemoryAccounts: any[] = [];

let inMemoryMessages: any[] = [];
let inMemoryProcessedEvents = new Set<string>();

/**
 * Get system Meta configuration
 */
export async function getMetaConfig(): Promise<any> {
  try {
    let config = await prisma.metaConfig.findUnique({ where: { id: 'default' } });
    if (!config) {
      config = await prisma.metaConfig.create({
        data: {
          id: 'default',
          appId: inMemoryConfig.appId,
          appSecret: inMemoryConfig.appSecret,
          verifyToken: inMemoryConfig.verifyToken,
          pixelId: inMemoryConfig.pixelId,
          capiAccessToken: inMemoryConfig.capiAccessToken,
          isLive: false,
          webhookStatus: 'INACTIVE',
        }
      });
    }
    return config;
  } catch (err) {
    return inMemoryConfig;
  }
}

/**
 * Update system Meta configuration
 */
export async function updateMetaConfig(updates: Partial<any>): Promise<any> {
  const dataToSave: any = { ...updates };
  if (updates.appSecret) {
    dataToSave.appSecret = encryptToken(updates.appSecret);
  }
  if (updates.capiAccessToken) {
    dataToSave.capiAccessToken = encryptToken(updates.capiAccessToken);
  }

  try {
    const updated = await prisma.metaConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...dataToSave },
      update: dataToSave,
    });
    return updated;
  } catch (err) {
    inMemoryConfig = { ...inMemoryConfig, ...dataToSave, updatedAt: new Date() };
    return inMemoryConfig;
  }
}

/**
 * Get all connected Meta accounts
 */
export async function listMetaAccounts(): Promise<any[]> {
  try {
    return await prisma.metaAccount.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  } catch (err) {
    return inMemoryAccounts;
  }
}

/**
 * Connect or update a Meta account
 */
export async function upsertMetaAccount(account: {
  platform: string;
  accountId: string;
  accountName: string;
  accessToken?: string;
  tokenExpiresAt?: Date | null;
  scope?: string;
  metadata?: any;
  status?: string;
}): Promise<any> {
  const encryptedToken = account.accessToken ? encryptToken(account.accessToken) : undefined;
  const payload: any = {
    platform: account.platform,
    accountId: account.accountId,
    accountName: account.accountName,
    status: account.status || 'CONNECTED',
    accessToken: encryptedToken,
    tokenExpiresAt: account.tokenExpiresAt || new Date(Date.now() + 60 * 24 * 3600 * 1000),
    scope: account.scope || '',
    metadata: account.metadata || {},
    lastSyncAt: new Date(),
    errorMessage: null,
  };

  try {
    return await prisma.metaAccount.upsert({
      where: {
        platform_accountId: {
          platform: account.platform,
          accountId: account.accountId,
        }
      },
      create: payload,
      update: payload,
    });
  } catch (err) {
    const idx = inMemoryAccounts.findIndex(a => a.platform === account.platform && a.accountId === account.accountId);
    if (idx >= 0) {
      inMemoryAccounts[idx] = { ...inMemoryAccounts[idx], ...payload, updatedAt: new Date() };
      return inMemoryAccounts[idx];
    } else {
      const newAcc = { id: `acc_${Date.now()}`, ...payload, createdAt: new Date() };
      inMemoryAccounts.push(newAcc);
      return newAcc;
    }
  }
}

/**
 * Disconnect a Meta account
 */
export async function disconnectMetaAccount(platform: string, accountId?: string): Promise<boolean> {
  try {
    if (accountId) {
      await prisma.metaAccount.update({
        where: { platform_accountId: { platform, accountId } },
        data: { status: 'DISCONNECTED', accessToken: null, errorMessage: 'Account disconnected by administrator' }
      });
    } else {
      await prisma.metaAccount.updateMany({
        where: { platform },
        data: { status: 'DISCONNECTED', accessToken: null, errorMessage: 'Account disconnected by administrator' }
      });
    }
    return true;
  } catch (err) {
    inMemoryAccounts = inMemoryAccounts.map(a => {
      if (a.platform === platform && (!accountId || a.accountId === accountId)) {
        return { ...a, status: 'DISCONNECTED', accessToken: null };
      }
      return a;
    });
    return true;
  }
}

/**
 * Mark event as processed to prevent duplicate processing
 */
export async function checkAndRecordProcessedEvent(eventId: string, eventType: string, summary?: string): Promise<boolean> {
  if (!eventId) return true; // allow processing if no event id

  try {
    const existing = await prisma.metaProcessedEvent.findUnique({
      where: { eventId }
    });
    if (existing) {
      return false; // Already processed!
    }
    await prisma.metaProcessedEvent.create({
      data: {
        eventId,
        eventType,
        payloadSummary: summary || null,
      }
    });
    return true;
  } catch (err) {
    if (inMemoryProcessedEvents.has(eventId)) {
      return false;
    }
    inMemoryProcessedEvents.add(eventId);
    return true;
  }
}

/**
 * Fetch and process Lead Ads from Meta Graph API
 */
export async function fetchMetaLeadDetails(leadgenId: string, pageAccessToken: string): Promise<any> {
  const token = decryptToken(pageAccessToken);
  try {
    const url = `${GRAPH_API_BASE}/${leadgenId}?access_token=${encodeURIComponent(token)}`;
    return await fetchJson(url);
  } catch (error: any) {
    console.error(`Error fetching lead details for ${leadgenId}:`, error?.response?.data || error.message);
    throw error;
  }
}

/**
 * Exchange an Embedded Signup Authorization Code or Session for a permanent System User/WABA Token
 * and retrieve WABA ID, Phone Number ID, and Coexistence details.
 */
export async function exchangeEmbeddedSignupCode(params: {
  code: string;
  appId: string;
  appSecret: string;
}): Promise<{
  accessToken: string;
  wabaId?: string;
  phoneNumberId?: string;
  phoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  coexistenceEligible?: boolean;
}> {
  // 1. Exchange code for access token
  const tokenUrl = `${GRAPH_API_BASE}/oauth/access_token?client_id=${encodeURIComponent(params.appId)}&client_secret=${encodeURIComponent(params.appSecret)}&code=${encodeURIComponent(params.code)}`;
  const tokenRes = await fetchJson(tokenUrl);
  const accessToken = tokenRes.access_token;
  if (!accessToken) {
    throw new Error('Failed to exchange Embedded Signup code for access token');
  }

  // 2. Query debug_token to get granular scopes and target WABA / Business ID
  let wabaId: string | undefined;
  let phoneNumberId: string | undefined;
  let phoneNumber: string | undefined;
  let verifiedName: string | undefined;
  let qualityRating: string | undefined;

  try {
    const debugUrl = `${GRAPH_API_BASE}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(params.appId)}|${encodeURIComponent(params.appSecret)}`;
    const debugRes = await fetchJson(debugUrl);
    const granularScopes = debugRes.data?.granular_scopes || [];
    
    // Find target WABA from granular scopes
    const waScope = granularScopes.find((s: any) => s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging');
    if (waScope && waScope.target_ids && waScope.target_ids.length > 0) {
      wabaId = waScope.target_ids[0];
    }
  } catch (debugErr) {
    console.warn('debug_token query warning:', debugErr);
  }

  // 3. If WABA ID found, query its phone numbers
  if (wabaId) {
    try {
      const phoneUrl = `${GRAPH_API_BASE}/${wabaId}/phone_numbers?access_token=${encodeURIComponent(accessToken)}`;
      const phoneRes = await fetchJson(phoneUrl);
      const phones = phoneRes.data || [];
      if (phones.length > 0) {
        phoneNumberId = phones[0].id;
        phoneNumber = phones[0].display_phone_number;
        verifiedName = phones[0].verified_name;
        qualityRating = phones[0].quality_rating;
      }
    } catch (phoneErr) {
      console.warn('WABA phone numbers lookup warning:', phoneErr);
    }
  }

  return {
    accessToken,
    wabaId,
    phoneNumberId,
    phoneNumber,
    verifiedName,
    qualityRating,
    coexistenceEligible: true,
  };
}

/**
 * Fetch approved WhatsApp message templates from Meta Graph API
 */
export async function fetchWhatsAppTemplates(wabaId: string, accessToken: string): Promise<any[]> {
  const token = decryptToken(accessToken);
  if (!token || token.startsWith('EAA_DEMO_')) {
    // Return standard approved production templates for UTC Travel
    return [
      {
        name: 'utc_welcome_holiday_inquiry',
        status: 'APPROVED',
        language: 'en_US',
        category: 'MARKETING',
        components: [
          { type: 'HEADER', format: 'TEXT', text: 'Welcome to UTC Travel' },
          { type: 'BODY', text: 'Hello {{1}}, thank you for inquiring about {{2}}! Our holiday specialist is preparing your personalized itinerary.' },
          { type: 'FOOTER', text: 'UTC Travel Team' }
        ]
      },
      {
        name: 'utc_itinerary_followup',
        status: 'APPROVED',
        language: 'en_US',
        category: 'UTILITY',
        components: [
          { type: 'HEADER', format: 'TEXT', text: 'Your UTC Travel Itinerary is Ready' },
          { type: 'BODY', text: 'Dear {{1}}, we have updated your travel quote for {{2}}. Please let us know if you would like to schedule a quick call.' },
          { type: 'FOOTER', text: 'UTC Travel Holidays' }
        ]
      },
      {
        name: 'utc_payment_confirmation',
        status: 'APPROVED',
        language: 'en_US',
        category: 'UTILITY',
        components: [
          { type: 'BODY', text: 'Thank you {{1}}! Your booking reference {{2}} has been confirmed.' }
        ]
      }
    ];
  }

  try {
    const url = `${GRAPH_API_BASE}/${wabaId}/message_templates?status=APPROVED&access_token=${encodeURIComponent(token)}`;
    const res = await fetchJson(url);
    return res.data || [];
  } catch (err: any) {
    console.warn('Error fetching WhatsApp templates from Graph API:', err?.response?.data || err.message);
    return [];
  }
}

/**
 * Send WhatsApp Message via Meta Cloud API
 */
export async function sendWhatsAppMessageApi(options: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  type: 'text' | 'template';
  text?: string;
  templateName?: string;
  languageCode?: string;
  components?: any[];
}): Promise<{ messageId: string }> {
  const token = decryptToken(options.accessToken);
  const url = `${GRAPH_API_BASE}/${options.phoneNumberId}/messages`;

  let payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: options.to.replace(/\D/g, ''),
  };

  if (options.type === 'text') {
    payload.type = 'text';
    payload.text = { preview_url: true, body: options.text || '' };
  } else {
    payload.type = 'template';
    payload.template = {
      name: options.templateName,
      language: { code: options.languageCode || 'en_US' },
      components: options.components || [],
    };
  }

  // If mock/demo mode without live credentials, simulate response
  if (!token || token.startsWith('EAA_DEMO_')) {
    const fakeId = `wamid.HBgM${Date.now()}DEMO`;
    return { messageId: fakeId };
  }

  const res = await fetchJson(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return { messageId: res?.messages?.[0]?.id || `wamid.${Date.now()}` };
}

/**
 * Test WhatsApp Cloud API Connectivity
 */
export async function testWhatsAppConnection(phoneNumberId: string, accessToken: string): Promise<{
  success: boolean;
  phoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  codeVerificationStatus?: string;
  error?: string;
}> {
  const token = decryptToken(accessToken);
  if (!token || token.startsWith('EAA_DEMO_')) {
    return {
      success: true,
      phoneNumber: '+1 555-DEMO-WA',
      verifiedName: 'UTC Travel Demo (Sandbox)',
      qualityRating: 'GREEN',
      codeVerificationStatus: 'VERIFIED',
    };
  }

  try {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status&access_token=${encodeURIComponent(token)}`;
    const data = await fetchJson(url);
    return {
      success: true,
      phoneNumber: data.display_phone_number,
      verifiedName: data.verified_name,
      qualityRating: data.quality_rating,
      codeVerificationStatus: data.code_verification_status,
    };
  } catch (error: any) {
    const errMsg = error?.response?.data?.error?.message || error.message || 'WhatsApp Cloud API connection test failed';
    return {
      success: false,
      error: errMsg,
    };
  }
}

/**
 * Send Conversions API (CAPI) event to Meta
 */
export async function sendConversionsApiEvent(eventData: {
  eventName: string;
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string;
  userData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    fbp?: string;
    fbc?: string;
  };
  customData?: {
    value?: number;
    currency?: string;
    contentName?: string;
    contentCategory?: string;
    contentIds?: string[];
    destination?: string;
    numTravelers?: number;
    referenceNumber?: string;
  };
}): Promise<any> {
  const config = await getMetaConfig();
  if (!config.trackCapi || !config.pixelId) {
    return { skipped: true, reason: 'CAPI tracking disabled or missing pixelId' };
  }

  const token = config.capiAccessToken ? decryptToken(config.capiAccessToken) : process.env.META_CAPI_TOKEN;

  // Prepare hashed user data adhering to Meta Conversions API specifications
  const userPayload: any = {};
  if (eventData.userData.email) userPayload.em = [hashForCapi(eventData.userData.email)];
  if (eventData.userData.phone) userPayload.ph = [hashForCapi(eventData.userData.phone.replace(/\D/g, ''))];
  if (eventData.userData.firstName) userPayload.fn = [hashForCapi(eventData.userData.firstName)];
  if (eventData.userData.lastName) userPayload.ln = [hashForCapi(eventData.userData.lastName)];
  if (eventData.userData.clientIpAddress) userPayload.client_ip_address = eventData.userData.clientIpAddress;
  if (eventData.userData.clientUserAgent) userPayload.client_user_agent = eventData.userData.clientUserAgent;
  if (eventData.userData.fbp) userPayload.fbp = eventData.userData.fbp;
  if (eventData.userData.fbc) userPayload.fbc = eventData.userData.fbc;

  const payload: any = {
    data: [
      {
        event_name: eventData.eventName,
        event_time: eventData.eventTime || Math.floor(Date.now() / 1000),
        event_id: eventData.eventId, // REQUIRED FOR DEDUPLICATION WITH BROWSER PIXEL
        event_source_url: eventData.eventSourceUrl || 'https://utctravel.com',
        action_source: 'website',
        user_data: userPayload,
        custom_data: eventData.customData,
      }
    ]
  };

  if (config.testEventCode) {
    payload.test_event_code = config.testEventCode;
  }

  // If in demo or test mode without valid token
  if (!token || token.startsWith('EAA_DEMO_')) {
    return {
      success: true,
      demoMode: true,
      message: 'Simulated CAPI event recorded with deduplication ID: ' + eventData.eventId,
      payload,
    };
  }

  try {
    const response = await fetchJson(`${GRAPH_API_BASE}/${config.pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { success: true, metaResponse: response };
  } catch (error: any) {
    console.error('Meta CAPI Error:', error?.response?.data || error.message);
    return {
      success: false,
      error: error?.response?.data?.error?.message || error.message,
    };
  }
}
