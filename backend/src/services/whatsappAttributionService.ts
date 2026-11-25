import { decryptToken } from '../utils/metaCrypto';
import { GRAPH_API_BASE, fetchJson } from './metaService';
import prisma from '../utils/prisma';

export interface ClickToWhatsAppReferral {
  sourceType?: string; // 'ad', 'post', etc.
  sourceId?: string; // Meta ad id or post id
  sourceUrl?: string; // Meta ad url / fb post url
  headline?: string; // Headline of the ad
  body?: string; // Body text of the ad
  mediaType?: string; // 'image', 'video'
  imageUrl?: string;
  videoUrl?: string;
  ctwaClid?: string; // Click-to-WhatsApp click ID
  campaignId?: string; // Resolved or passed campaign ID
  campaignName?: string; // Resolved campaign name (e.g., 'Goa', 'Maldives', 'Pakistan')
  adId?: string;
  adName?: string;
  isReferral: boolean;
}

export interface ExtractedAttribution {
  sourceTag: string; // e.g. "WhatsApp - Goa Campaign" or "WhatsApp - Organic"
  campaignName?: string; // e.g. "Goa", "Maldives", "Pakistan"
  campaignId?: string;
  adId?: string;
  adName?: string;
  sourceUrl?: string;
  sourceId?: string;
  headline?: string;
  body?: string;
  ctwaClid?: string;
  isReferral: boolean;
}

// In-memory cache for resolved Meta campaign and ad names to minimize Graph API latency
const metaEntityCache = new Map<string, { name: string; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Resolves an active Meta Access Token from connected MetaAccounts or MetaConfig
 */
async function getEffectiveMetaAccessToken(): Promise<string | null> {
  try {
    // 1. Look for connected AD_ACCOUNT, FACEBOOK, or WHATSAPP account with valid token
    const account = await prisma.metaAccount.findFirst({
      where: {
        status: 'CONNECTED',
        accessToken: { not: null }
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (account?.accessToken) {
      return decryptToken(account.accessToken);
    }

    // 2. Fallback to MetaConfig capiAccessToken or process.env
    const config = await prisma.metaConfig.findUnique({ where: { id: 'default' } });
    if (config?.capiAccessToken) {
      return decryptToken(config.capiAccessToken);
    }
  } catch (err) {
    // DB unreachable fallback
  }

  if (process.env.META_CAPI_TOKEN) {
    return process.env.META_CAPI_TOKEN;
  }
  if (process.env.META_SYSTEM_USER_TOKEN) {
    return process.env.META_SYSTEM_USER_TOKEN;
  }
  return null;
}

/**
 * Resolves a Campaign Name from Meta Graph API given a Campaign ID or Ad ID
 */
export async function resolveMetaCampaignDetails(id: string): Promise<{ campaignName?: string; campaignId?: string; adName?: string } | null> {
  if (!id) return null;

  const cached = metaEntityCache.get(id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { campaignName: cached.name };
  }

  const token = await getEffectiveMetaAccessToken();
  if (!token) {
    return null;
  }

  try {
    // Attempt 1: If id is an ad, fetch its campaign info
    const url = `${GRAPH_API_BASE}/${id}?fields=name,campaign{id,name}&access_token=${encodeURIComponent(token)}`;
    const data = await fetchJson(url);

    if (data?.campaign?.name) {
      const campName = cleanCampaignName(data.campaign.name);
      metaEntityCache.set(id, { name: campName, timestamp: Date.now() });
      if (data.campaign.id) {
        metaEntityCache.set(data.campaign.id, { name: campName, timestamp: Date.now() });
      }
      return {
        campaignName: campName,
        campaignId: data.campaign.id,
        adName: data.name
      };
    } else if (data?.name) {
      // It might be a campaign object directly
      const campName = cleanCampaignName(data.name);
      metaEntityCache.set(id, { name: campName, timestamp: Date.now() });
      return {
        campaignName: campName,
        campaignId: id
      };
    }
  } catch (err: any) {
    // Graph API failed or unauthorized
  }

  return null;
}

/**
 * Normalizes and cleans campaign name to standard friendly display
 * e.g. "Goa_Leads_Nov2026" -> "Goa", "Pakistan Tour Promo" -> "Pakistan"
 */
export function cleanCampaignName(rawName?: string): string {
  if (!rawName) return '';
  const trimmed = rawName.trim();

  // If already concise, return
  if (/^(goa|maldives|pakistan|kashmir|kerala|dubai|thailand|singapore|bali|vietnam|europe)$/i.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  // Check common destination patterns in campaign names
  const destinations = ['Goa', 'Maldives', 'Pakistan', 'Kashmir', 'Kerala', 'Dubai', 'Thailand', 'Singapore', 'Bali', 'Vietnam', 'Europe', 'Sri Lanka', 'Baku', 'Georgia', 'Turkey', 'Malaysia'];
  for (const dest of destinations) {
    const regex = new RegExp(`\\b${dest}\\b`, 'i');
    if (regex.test(trimmed)) {
      return dest;
    }
  }

  // Otherwise clean underscores, hyphens, and dates
  return trimmed
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses Click-to-WhatsApp referral metadata from any incoming WhatsApp webhook payload.
 * Handles:
 * 1. Meta WhatsApp Cloud API (entry[].changes[].value.messages[].referral)
 * 2. Upgrow WhatsApp Webhook (body.referral, body.messages[].referral, body.context, body.campaign)
 */
export async function extractWhatsAppAttribution(msgObj: any, rootPayload: any = {}): Promise<ExtractedAttribution> {
  const referral = 
    msgObj?.referral || 
    rootPayload?.referral || 
    rootPayload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.referral ||
    rootPayload?.message?.referral ||
    null;

  // Additional fields from Upgrow / Meta context
  const sourceUrl: string | undefined = referral?.source_url || rootPayload?.source_url || rootPayload?.url;
  const sourceId: string | undefined = referral?.source_id || rootPayload?.source_id || rootPayload?.ad_id;
  const sourceType: string | undefined = referral?.source_type || rootPayload?.source_type;
  const headline: string | undefined = referral?.headline || rootPayload?.headline;
  const bodyText: string | undefined = referral?.body || rootPayload?.body;
  const ctwaClid: string | undefined = referral?.ctwa_clid || rootPayload?.ctwa_clid;

  // Direct campaign fields from webhook payload if present
  let rawCampaignName: string | undefined = 
    referral?.campaign_name || 
    rootPayload?.campaign_name || 
    rootPayload?.campaign || 
    rootPayload?.campaignName ||
    referral?.headline ||
    undefined;

  let rawCampaignId: string | undefined = 
    referral?.campaign_id || 
    rootPayload?.campaign_id || 
    rootPayload?.campaignId || 
    undefined;

  let rawAdId: string | undefined = sourceId || referral?.ad_id || rootPayload?.ad_id;
  let rawAdName: string | undefined = referral?.ad_name || rootPayload?.ad_name || headline;

  const isReferral = !!(referral || sourceId || sourceUrl || ctwaClid || rawCampaignName || rawCampaignId);

  if (!isReferral) {
    return {
      sourceTag: 'WhatsApp - Organic',
      isReferral: false
    };
  }

  // If we have an ad/source ID or campaign ID, but no campaign name, query Meta Graph API
  if (!rawCampaignName && (rawCampaignId || rawAdId)) {
    const targetId = rawCampaignId || rawAdId;
    if (targetId) {
      const resolved = await resolveMetaCampaignDetails(targetId);
      if (resolved?.campaignName) {
        rawCampaignName = resolved.campaignName;
      }
      if (resolved?.campaignId && !rawCampaignId) {
        rawCampaignId = resolved.campaignId;
      }
      if (resolved?.adName && !rawAdName) {
        rawAdName = resolved.adName;
      }
    }
  }

  // Derive campaign from source_url if campaign name is still empty (e.g. utm_campaign=Goa or fb.me ad)
  if (!rawCampaignName && sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      const utmCampaign = url.searchParams.get('utm_campaign') || url.searchParams.get('campaign');
      if (utmCampaign) {
        rawCampaignName = utmCampaign;
      }
    } catch {}
  }

  const resolvedCampaign = cleanCampaignName(rawCampaignName) || (rawCampaignId ? `Campaign #${rawCampaignId}` : 'Meta Ad');

  return {
    sourceTag: `WhatsApp - ${resolvedCampaign}`,
    campaignName: resolvedCampaign,
    campaignId: rawCampaignId,
    adId: rawAdId,
    adName: rawAdName,
    sourceUrl,
    sourceId,
    headline,
    body: bodyText,
    ctwaClid,
    isReferral: true
  };
}

/**
 * Formats a clean campaign attribution string for CustomerRequirement / Notes
 */
export function formatAttributionNotes(attr: ExtractedAttribution): string {
  if (!attr.isReferral) {
    return 'Meta Attribution: WhatsApp - Organic';
  }

  const lines = [
    `Meta Campaign Attribution: ${attr.campaignName || 'Meta Ad'}`,
    attr.campaignId ? `Campaign ID: ${attr.campaignId}` : null,
    attr.adName ? `Ad Name: ${attr.adName}` : null,
    attr.adId ? `Ad ID: ${attr.adId}` : null,
    attr.sourceUrl ? `Source URL: ${attr.sourceUrl}` : null,
    attr.sourceId ? `Source ID: ${attr.sourceId}` : null,
    attr.ctwaClid ? `Click ID (ctwa_clid): ${attr.ctwaClid}` : null,
    attr.headline ? `Ad Headline: "${attr.headline}"` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

