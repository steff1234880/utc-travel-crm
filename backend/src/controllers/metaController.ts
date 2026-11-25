import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { assignLeadAutomatically } from '../services/leadAssignmentService';
import { resolveDefaultPipelineStageId } from '../services/pipelineStageService';
import { generateUniqueEnquiryReference } from '../services/enquiryReferenceService';
import { extractWhatsAppAttribution, formatAttributionNotes } from '../services/whatsappAttributionService';
import {
  getMetaConfig,
  updateMetaConfig,
  listMetaAccounts,
  upsertMetaAccount,
  disconnectMetaAccount,
  checkAndRecordProcessedEvent,
  fetchMetaLeadDetails,
  sendWhatsAppMessageApi,
  sendConversionsApiEvent,
  testWhatsAppConnection,
  exchangeEmbeddedSignupCode,
  fetchWhatsAppTemplates,
  META_GRAPH_API_VERSION,
  fetchJson,
  GRAPH_API_BASE,
} from '../services/metaService';
import { verifyMetaSignature, maskToken, decryptToken, encryptToken } from '../utils/metaCrypto';
import { sendUpgrowWhatsAppMessage, getUpgrowApiKey } from '../services/upgrowWhatsAppService';

function generateRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = 'ENQ-';
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

/**
 * 1. GET /api/meta/config - Retrieve Meta connection configuration & status
 */
export async function getMetaConfigController(req: Request, res: Response): Promise<void> {
  try {
    const config = await getMetaConfig();
    const accounts = await listMetaAccounts();

    // Map accounts to safe representation without leaking raw secrets
    const sanitizedAccounts = accounts.map(a => ({
      id: a.id,
      platform: a.platform,
      accountId: a.accountId,
      accountName: a.accountName,
      status: a.status,
      tokenExpiresAt: a.tokenExpiresAt,
      scope: a.scope,
      metadata: a.metadata,
      lastSyncAt: a.lastSyncAt,
      errorMessage: a.errorMessage,
      hasToken: !!a.accessToken,
    }));

    // Find platform specific status (prefer most recently updated active account)
    const fbAccount = accounts.find(a => a.platform === 'FACEBOOK');
    const igAccount = accounts.find(a => a.platform === 'INSTAGRAM');
    const waAccount = accounts.find(a => a.platform === 'WHATSAPP');
    const waMetadata = (waAccount?.metadata as any) || {};

    res.status(200).json({
      success: true,
      data: {
        config: {
          appId: config.appId || '',
          appSecretMasked: maskToken(config.appSecret),
          hasAppSecret: !!config.appSecret,
          verifyToken: config.verifyToken || '',
          pixelId: config.pixelId || '',
          capiTokenMasked: maskToken(config.capiAccessToken),
          hasCapiToken: !!config.capiAccessToken,
          testEventCode: config.testEventCode || '',
          isLive: config.isLive,
          autoSyncLeads: config.autoSyncLeads,
          trackPixel: config.trackPixel,
          trackCapi: config.trackCapi,
          lastSyncAt: config.lastSyncAt,
          webhookStatus: config.webhookStatus,
          webhookLastError: config.webhookLastError,
        },
        connections: {
          facebook: {
            connected: fbAccount?.status === 'CONNECTED',
            account: fbAccount || null,
          },
          instagram: {
            connected: igAccount?.status === 'CONNECTED',
            account: igAccount || null,
          },
          whatsapp: {
            connected: waAccount?.status === 'CONNECTED',
            account: waAccount || null,
            phoneNumberId: waMetadata.phone_number_id || '',
            wabaId: waMetadata.waba_id || (waAccount?.accountId?.startsWith('whatsapp_utc_') ? '' : waAccount?.accountId) || '',
            businessEmail: waMetadata.business_email || waMetadata.email || '',
            hasAccessToken: !!waAccount?.accessToken,
            accessTokenMasked: maskToken(waAccount?.accessToken),
          },
        },
        accounts: sanitizedAccounts,
      }
    });
  } catch (error: any) {
    console.error('getMetaConfigController error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve Meta configuration' });
  }
}

/**
 * 2. PATCH /api/meta/config - Update Meta configuration credentials & toggles
 */
export async function updateMetaConfigController(req: Request, res: Response): Promise<void> {
  try {
    const {
      appId,
      appSecret,
      verifyToken,
      pixelId,
      capiAccessToken,
      testEventCode,
      isLive,
      autoSyncLeads,
      trackPixel,
      trackCapi,
    } = req.body;

    const updates: any = {};
    if (appId !== undefined) updates.appId = appId;
    if (appSecret !== undefined && appSecret !== '') updates.appSecret = appSecret;
    if (verifyToken !== undefined) updates.verifyToken = verifyToken;
    if (pixelId !== undefined) updates.pixelId = pixelId;
    if (capiAccessToken !== undefined && capiAccessToken !== '') updates.capiAccessToken = capiAccessToken;
    if (testEventCode !== undefined) updates.testEventCode = testEventCode;
    if (isLive !== undefined) updates.isLive = Boolean(isLive);
    if (autoSyncLeads !== undefined) updates.autoSyncLeads = Boolean(autoSyncLeads);
    if (trackPixel !== undefined) updates.trackPixel = Boolean(trackPixel);
    if (trackCapi !== undefined) updates.trackCapi = Boolean(trackCapi);

    const updated = await updateMetaConfig(updates);
    res.status(200).json({
      success: true,
      message: 'Meta configuration updated successfully',
      data: {
        appId: updated.appId,
        pixelId: updated.pixelId,
        isLive: updated.isLive,
        autoSyncLeads: updated.autoSyncLeads,
        trackPixel: updated.trackPixel,
        trackCapi: updated.trackCapi,
        webhookStatus: updated.webhookStatus,
      }
    });
  } catch (error: any) {
    console.error('updateMetaConfigController error:', error);
    res.status(500).json({ success: false, message: 'Failed to update Meta configuration' });
  }
}

/**
 * 3. POST /api/meta/connect - Connect or simulate connection of a Meta account
 */

// Temporary in-memory state store for CSRF prevention in OAuth flow
const oauthStateStore = new Map<string, { createdAt: number; redirectUri: string }>();

export function generateOAuthState(redirectUri: string): string {
  const state = 'state_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  oauthStateStore.set(state, { createdAt: Date.now(), redirectUri });
  return state;
}

export function validateOAuthState(state: string): boolean {
  if (!state || !oauthStateStore.has(state)) return false;
  const item = oauthStateStore.get(state)!;
  oauthStateStore.delete(state);
  // Valid for 10 minutes (600,000 ms)
  return (Date.now() - item.createdAt) <= 600000;
}

export async function getOAuthUrlController(req: Request, res: Response): Promise<void> {
  try {
    const { platform = "FACEBOOK", redirectUri, configId } = req.query;
    const config = await getMetaConfig();
    const state = generateOAuthState(String(redirectUri || ""));
    const appId = config.appId || "DEMO_APP_ID";
    const baseAuthUrl = `https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth`;
    
    let scope = "pages_show_list,pages_read_engagement,leads_retrieval,pages_manage_metadata";
    if (platform === 'INSTAGRAM') {
      scope = "pages_show_list,instagram_basic,instagram_manage_messages";
    } else if (platform === 'WHATSAPP') {
      scope = "whatsapp_business_management,whatsapp_business_messaging";
    }

    let authUrl = `${baseAuthUrl}?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(String(redirectUri || ""))}&state=${encodeURIComponent(state)}&response_type=code`;
    
    // If a valid numeric configId is supplied for Facebook Login for Business / Embedded Signup
    if (configId && /^\d+$/.test(String(configId).trim())) {
      authUrl += `&config_id=${encodeURIComponent(String(configId).trim())}&override_default_response_type=true`;
    } else {
      authUrl += `&scope=${encodeURIComponent(scope)}`;
    }

    res.status(200).json({ success: true, data: { authUrl, state } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Failed to generate OAuth URL" });
  }
}

export async function handleOAuthCallbackController(req: Request, res: Response): Promise<void> {
  try {
    const { code, state, platform = "FACEBOOK", redirectUri } = req.body;
    if (!state || !validateOAuthState(state)) {
      res.status(400).json({ success: false, message: "Invalid or expired OAuth state parameter (CSRF detected)" });
      return;
    }
    if (!code) {
      res.status(400).json({ success: false, message: "Authorization code is required" });
      return;
    }

    const config = await getMetaConfig();
    const appId = config.appId;
    const appSecret = config.appSecret ? decryptToken(config.appSecret) : '';

    let liveAccessToken: string | null = null;
    let tokenExpiresIn: number | null = null;

    // Exchange code for user/system access token if App credentials configured
    if (appId && appSecret) {
      try {
        if (platform === 'WHATSAPP') {
          // Embedded Signup flow handler
          const embeddedResult = await exchangeEmbeddedSignupCode({
            code,
            appId,
            appSecret,
          });

          const saved = await upsertMetaAccount({
            platform: 'WHATSAPP',
            accountId: embeddedResult.wabaId || `wa_waba_${Date.now()}`,
            accountName: embeddedResult.verifiedName || 'UTC WhatsApp Cloud API',
            accessToken: embeddedResult.accessToken,
            scope: 'whatsapp_business_messaging,whatsapp_business_management',
            metadata: {
              waba_id: embeddedResult.wabaId,
              phone_number_id: embeddedResult.phoneNumberId,
              display_phone_number: embeddedResult.phoneNumber,
              verified_name: embeddedResult.verifiedName,
              quality_rating: embeddedResult.qualityRating,
              coexistence_eligible: embeddedResult.coexistenceEligible,
              onboarding_method: 'EMBEDDED_SIGNUP',
            }
          });

          res.status(200).json({
            success: true,
            message: 'WhatsApp Embedded Signup completed successfully',
            data: {
              platform: saved.platform,
              accountId: saved.accountId,
              accountName: saved.accountName,
              phoneNumber: embeddedResult.phoneNumber,
              qualityRating: embeddedResult.qualityRating,
            }
          });
          return;
        }

        const tokenExchangeUrl = `${GRAPH_API_BASE}/oauth/access_token?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri || '')}&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}`;
        const tokenRes = await fetchJson(tokenExchangeUrl);
        liveAccessToken = tokenRes.access_token;
        tokenExpiresIn = tokenRes.expires_in;

        // If connecting Facebook Page, fetch the client's genuine Page(s) using the user token
        if (platform === 'FACEBOOK' && liveAccessToken) {
          try {
            const pagesUrl = `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,category,tasks&access_token=${encodeURIComponent(liveAccessToken)}`;
            const pagesRes = await fetchJson(pagesUrl);
            const pages = pagesRes.data || [];

            if (pages.length === 0) {
              res.status(400).json({
                success: false,
                message: 'No Facebook Pages found associated with this Facebook account. Please ensure your account has Admin/Manage access to a Facebook Page.',
              });
              return;
            }

            // Select the primary Facebook Page
            const primaryPage = pages[0];
            const pageId = primaryPage.id;
            const pageName = primaryPage.name;
            const pageAccessToken = primaryPage.access_token;

            // Automatically subscribe the Facebook Page to leadgen webhook events
            try {
              const subUrl = `${GRAPH_API_BASE}/${pageId}/subscribed_apps?subscribed_fields=leadgen,messages&access_token=${encodeURIComponent(pageAccessToken)}`;
              await fetchJson(subUrl, { method: 'POST' });
            } catch (subErr) {
              console.warn('Facebook Page subscribed_apps notification:', subErr);
            }

            const saved = await upsertMetaAccount({
              platform: 'FACEBOOK',
              accountId: pageId,
              accountName: pageName,
              accessToken: pageAccessToken,
              tokenExpiresAt: tokenExpiresIn ? new Date(Date.now() + tokenExpiresIn * 1000) : null,
              scope: 'pages_show_list,pages_read_engagement,leads_retrieval,pages_manage_metadata',
              metadata: {
                page_id: pageId,
                page_name: pageName,
                all_pages: pages.map((p: any) => ({ id: p.id, name: p.name })),
                connected_at: new Date().toISOString(),
                onboarding_method: 'OAUTH_DIALOG',
              }
            });

            res.status(200).json({
              success: true,
              message: `Facebook Page "${pageName}" connected and subscribed to Lead Ads successfully!`,
              data: {
                platform: saved.platform,
                accountId: saved.accountId,
                accountName: saved.accountName,
              }
            });
            return;
          } catch (pageErr: any) {
            console.error('Failed to fetch Facebook pages from Graph API:', pageErr?.response?.data || pageErr.message);
            res.status(400).json({
              success: false,
              message: pageErr?.response?.data?.error?.message || 'Failed to retrieve Facebook Pages from Meta Graph API.',
            });
            return;
          }
        }
      } catch (err: any) {
        console.warn('OAuth code exchange warning with Meta Graph API:', err?.response?.data || err.message);
        if (config.isLive) {
          res.status(400).json({
            success: false,
            message: err?.response?.data?.error?.message || 'Meta OAuth code exchange failed.',
          });
          return;
        }
      }
    }

    if (config.isLive && !liveAccessToken) {
      res.status(400).json({
        success: false,
        message: 'Live mode active: Meta authorization code could not be exchanged for a verified access token. Check App ID and App Secret.',
      });
      return;
    }

    const tokenToStore = liveAccessToken || `EAA_${String(platform).toUpperCase()}_AUTHORIZED_${Date.now()}`;
    const expiresAt = tokenExpiresIn ? new Date(Date.now() + tokenExpiresIn * 1000) : new Date(Date.now() + 60 * 24 * 3600 * 1000);

    const saved = await upsertMetaAccount({
      platform: String(platform).toUpperCase(),
      accountId: `${String(platform).toLowerCase()}_oauth_${Date.now()}`,
      accountName: `Connected ${platform} Account`,
      accessToken: tokenToStore,
      tokenExpiresAt: expiresAt,
      scope: "pages_show_list,leads_retrieval,whatsapp_business_messaging,whatsapp_business_management",
    });
    res.status(200).json({ success: true, message: "Account connected successfully via Meta OAuth", data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "OAuth callback failed" });
  }
}

/**
 * 3.1 POST /api/meta/whatsapp/test-connection - Test WhatsApp Cloud API Connectivity
 */
export async function testWhatsAppConnectionController(req: Request, res: Response): Promise<void> {
  try {
    const accounts = await listMetaAccounts();
    const waAccount = accounts.find(a => a.platform === 'WHATSAPP');

    const phoneNumberId = waAccount?.metadata?.phone_number_id || (req.body.phoneNumberId as string);
    const accessToken = waAccount?.accessToken || (req.body.accessToken as string);

    if (!phoneNumberId) {
      res.status(400).json({
        success: false,
        message: 'WhatsApp Phone Number ID is not configured. Please configure it in Meta Integration settings.',
      });
      return;
    }

    const result = await testWhatsAppConnection(phoneNumberId, accessToken || '');
    if (result.success) {
      // Record successful sync and mark status CONNECTED
      if (waAccount) {
        await upsertMetaAccount({
          platform: 'WHATSAPP',
          accountId: waAccount.accountId,
          accountName: result.verifiedName || waAccount.accountName,
          accessToken: waAccount.accessToken ? decryptToken(waAccount.accessToken) : undefined,
          status: 'CONNECTED',
          metadata: {
            ...((waAccount.metadata as any) || {}),
            quality_rating: result.qualityRating,
            verified_name: result.verifiedName,
            display_phone_number: result.phoneNumber,
            code_verification_status: result.codeVerificationStatus,
          }
        });
      }
      res.status(200).json({
        success: true,
        message: 'WhatsApp Cloud API connection test successful!',
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'WhatsApp Cloud API connection test failed',
      });
    }
  } catch (error: any) {
    console.error('testWhatsAppConnectionController error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test WhatsApp connection',
    });
  }
}

export async function connectAccountController(req: Request, res: Response): Promise<void> {
  try {
    const { platform, accountId, accountName, accessToken, scope, metadata } = req.body;
    if (!platform || !accountId) {
      res.status(400).json({ success: false, message: 'Platform and Account ID are required' });
      return;
    }

    const validPlatforms = ['FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'AD_ACCOUNT'];
    if (!validPlatforms.includes(platform.toUpperCase())) {
      res.status(400).json({ success: false, message: 'Invalid platform. Must be FACEBOOK, INSTAGRAM, or WHATSAPP.' });
      return;
    }

    const config = await getMetaConfig();
    const isLive = config.isLive;

    // For WhatsApp, if credentials are provided manually without prior test,
    // verify connectivity with Meta Graph API if in live mode or if an access token is provided
    let accountStatus = 'CONFIGURED';
    let verifiedAccountName = accountName;

    if (platform.toUpperCase() === 'WHATSAPP') {
      // Find existing WhatsApp account to preserve token or metadata if needed
      const existingWa = await prisma.metaAccount.findFirst({
        where: { platform: 'WHATSAPP' },
        orderBy: { updatedAt: 'desc' },
      });

      const effectiveToken = accessToken || (existingWa?.accessToken ? decryptToken(existingWa.accessToken) : undefined);
      const phoneNumberId = metadata?.phone_number_id || (existingWa?.metadata as any)?.phone_number_id || accountId;

      if (effectiveToken && !effectiveToken.startsWith('EAA_DEMO_')) {
        const testRes = await testWhatsAppConnection(phoneNumberId, effectiveToken);
        if (testRes.success) {
          accountStatus = 'CONNECTED';
          if (testRes.verifiedName) verifiedAccountName = testRes.verifiedName;
          metadata.quality_rating = testRes.qualityRating;
          metadata.verified_name = testRes.verifiedName;
          metadata.display_phone_number = testRes.phoneNumber;
          metadata.code_verification_status = testRes.codeVerificationStatus;
        } else if (isLive) {
          res.status(400).json({
            success: false,
            message: `WhatsApp API verification failed: ${testRes.error || 'Invalid credentials or phone number ID'}. Credentials not saved.`,
          });
          return;
        } else {
          accountStatus = 'DISCONNECTED';
        }
      } else if (isLive) {
        if (!effectiveToken) {
          res.status(400).json({
            success: false,
            message: 'Live mode active: A genuine System User access token is required to connect WhatsApp.',
          });
          return;
        }
      }

      // Merge metadata with existing WhatsApp metadata
      const mergedMetadata = {
        ...((existingWa?.metadata as any) || {}),
        ...(metadata || {}),
      };

      // Ensure stable primary WhatsApp account record to prevent duplicate stale records
      let savedWa: any;
      if (existingWa) {
        const encrypted = effectiveToken ? encryptToken(effectiveToken) : existingWa.accessToken;
        savedWa = await prisma.metaAccount.update({
          where: { id: existingWa.id },
          data: {
            accountId,
            accountName: verifiedAccountName || existingWa.accountName || 'UTC WhatsApp Cloud API',
            status: accountStatus,
            accessToken: encrypted,
            metadata: mergedMetadata,
            lastSyncAt: new Date(),
            errorMessage: null,
          }
        });

        // Clean up any other duplicate WhatsApp records to prevent stale data conflicts
        await prisma.metaAccount.deleteMany({
          where: {
            platform: 'WHATSAPP',
            id: { not: savedWa.id }
          }
        }).catch(() => {});
      } else {
        savedWa = await upsertMetaAccount({
          platform: 'WHATSAPP',
          accountId,
          accountName: verifiedAccountName || 'UTC WhatsApp Cloud API',
          accessToken: effectiveToken,
          scope,
          metadata: mergedMetadata,
          status: accountStatus,
        });
      }

      res.status(200).json({
        success: true,
        message: `Successfully updated WhatsApp API credentials (${savedWa.status === 'CONNECTED' ? 'Connected' : 'Saved'})`,
        data: {
          id: savedWa.id,
          platform: savedWa.platform,
          accountId: savedWa.accountId,
          accountName: savedWa.accountName,
          status: savedWa.status,
          metadata: savedWa.metadata,
        }
      });
      return;
    } else if (config.isLive && (!accessToken || accessToken.startsWith('EAA_DEMO_'))) {
      res.status(400).json({
        success: false,
        message: 'Live mode active: Real Meta OAuth authorization or genuine System User access token is required. Mock demo connections are rejected.',
      });
      return;
    } else {
      accountStatus = 'CONNECTED';
    }

    const saved = await upsertMetaAccount({
      platform: platform.toUpperCase(),
      accountId,
      accountName: verifiedAccountName || `${platform} Business Account`,
      accessToken: accessToken || (isLive ? undefined : `EAA_DEMO_${platform}_TOKEN`),
      scope,
      metadata,
      status: accountStatus,
    });

    res.status(200).json({
      success: true,
      message: `Successfully connected ${platform} account: ${saved.accountName}`,
      data: {
        id: saved.id,
        platform: saved.platform,
        accountId: saved.accountId,
        accountName: saved.accountName,
        status: saved.status,
      }
    });
  } catch (error: any) {
    console.error('connectAccountController error:', error);
    res.status(500).json({ success: false, message: 'Failed to connect Meta account' });
  }
}

/**
 * 4. POST /api/meta/disconnect - Disconnect account
 */
export async function disconnectAccountController(req: Request, res: Response): Promise<void> {
  try {
    const { platform, accountId } = req.body;
    if (!platform) {
      res.status(400).json({ success: false, message: 'Platform is required' });
      return;
    }

    await disconnectMetaAccount(platform.toUpperCase(), accountId);
    res.status(200).json({
      success: true,
      message: `Disconnected ${platform} account successfully`,
    });
  } catch (error: any) {
    console.error('disconnectAccountController error:', error);
    res.status(500).json({ success: false, message: 'Failed to disconnect account' });
  }
}

/**
 * 5. GET /api/meta/webhook - Meta Webhook Verification Challenge
 */
export async function verifyWebhookController(req: Request, res: Response): Promise<void> {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const config = await getMetaConfig();
    const expectedToken = config.verifyToken || process.env.META_VERIFY_TOKEN || 'utc_travel_meta_verify_token_2026';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('Meta Webhook verified successfully!');
      // Update webhook status
      await updateMetaConfig({ webhookStatus: 'ACTIVE', webhookLastError: null });
      res.status(200).send(challenge);
    } else {
      console.warn('Meta Webhook verification failed. Token mismatch.');
      await updateMetaConfig({ webhookStatus: 'ERROR', webhookLastError: 'Verification token mismatch' });
      res.sendStatus(403);
    }
  } catch (error: any) {
    console.error('verifyWebhookController error:', error);
    res.sendStatus(500);
  }
}

/**
 * 6. POST /api/meta/webhook - Receive and process Meta Webhook Events
 */
export async function handleWebhookEventController(req: Request, res: Response): Promise<void> {
  // Acknowledge immediately to avoid Meta retrying
  res.status(200).send('EVENT_RECEIVED');

  try {
    const config = await getMetaConfig();
    const body = req.body;

    // Signature verification when in live mode and appSecret exists
    if (config.isLive && config.appSecret) {
      const signature = req.headers['x-hub-signature-256'] as string;
      const secret = decryptToken(config.appSecret);
      // Prefer raw body buffer captured by body parser for accurate HMAC-SHA256 verification
      const rawPayload = (req as any).rawBody ? (req as any).rawBody.toString('utf8') : JSON.stringify(body);
      const isValid = verifyMetaSignature(rawPayload, signature, secret);
      if (!isValid) {
        console.warn('Rejected webhook event: Invalid HMAC signature');
        await updateMetaConfig({ webhookLastError: 'HMAC signature mismatch' });
        return;
      }
    }

    if (body.object === 'page') {
      // Facebook Page events (Lead Ads or Messenger)
      for (const entry of body.entry || []) {
        // A. Leadgen Events
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value?.leadgen_id;
            const formId = change.value?.form_id;
            const pageId = change.value?.page_id;

            // Deduplication check
            const isNew = await checkAndRecordProcessedEvent(leadgenId, 'LEADGEN', `FB Lead ${leadgenId}`);
            if (!isNew) {
              console.log(`Leadgen event ${leadgenId} already processed. Skipping duplicate.`);
              continue;
            }

            await processMetaLead({
              leadgenId,
              formId,
              pageId,
              source: 'Facebook Lead Ad',
            });
          }
        }

        // B. Messenger Events
        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender?.id;
          const recipientId = messaging.recipient?.id;
          const mid = messaging.message?.mid;
          const text = messaging.message?.text;

          if (mid) {
            const isNew = await checkAndRecordProcessedEvent(mid, 'MESSAGE', `FB Messenger ${mid}`);
            if (isNew && text) {
              await recordMetaMessage({
                platform: 'MESSENGER',
                externalId: mid,
                senderId,
                recipientId,
                direction: 'INBOUND',
                content: text,
                status: 'READ',
              });
            }
          }
        }
      }
    } else if (body.object === 'instagram') {
      // Instagram Business Messaging
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          const mid = messaging.message?.mid;
          const senderId = messaging.sender?.id;
          const recipientId = messaging.recipient?.id;
          const text = messaging.message?.text || (messaging.message?.attachments ? '[Instagram Media/Attachment]' : '');
          const senderUsername = messaging.sender?.username || undefined;

          if (mid && (text || messaging.message?.attachments)) {
            const isNew = await checkAndRecordProcessedEvent(mid, 'MESSAGE', `IG DM ${mid}`);
            if (isNew) {
              await recordMetaMessage({
                platform: 'INSTAGRAM',
                externalId: mid,
                senderId,
                senderName: senderUsername,
                recipientId,
                direction: 'INBOUND',
                content: text || '[Instagram Media]',
                status: 'READ',
                rawPayload: messaging,
              });
            }
          }
        }
      }
    } else if (body.object === 'whatsapp_business_account') {
      // WhatsApp Business Cloud API Events
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const val = change.value;
          if (val && val.messages) {
            for (const msg of val.messages) {
              const msgId = msg.id;
              const from = msg.from;
              const contact = val.contacts?.find((c: any) => c.wa_id === from);
              const senderName = contact?.profile?.name || from;
              const text = msg.text?.body || (msg.type ? `[${msg.type.toUpperCase()} Attachment]` : '');

              const isNew = await checkAndRecordProcessedEvent(msgId, 'MESSAGE', `WhatsApp ${msgId}`);
              if (isNew) {
                await recordMetaMessage({
                  platform: 'WHATSAPP',
                  externalId: msgId,
                  senderId: from,
                  senderName,
                  recipientId: val.metadata?.display_phone_number || 'UTC_WHATSAPP',
                  direction: 'INBOUND',
                  content: text,
                  status: 'DELIVERED',
                  rawPayload: msg,
                });
              }
            }
          }

          // Message Status updates (sent, delivered, read)
          if (val && val.statuses) {
            for (const statusObj of val.statuses) {
              const msgId = statusObj.id;
              const newStatus = statusObj.status?.toUpperCase(); // SENT, DELIVERED, READ, FAILED
              try {
                await prisma.metaMessage.updateMany({
                  where: { externalId: msgId },
                  data: { status: newStatus }
                });
              } catch (e) {
                // Ignore if message not found
              }
            }
          }
        }
      }
    }

    await updateMetaConfig({ lastSyncAt: new Date(), webhookStatus: 'ACTIVE', webhookLastError: null });
  } catch (error: any) {
    console.error('handleWebhookEventController error:', error);
    await updateMetaConfig({ webhookStatus: 'ERROR', webhookLastError: error.message });
  }
}

/**
 * Process Facebook/Instagram Lead Ad and import into CRM Enquiry
 */
async function processMetaLead(leadData: {
  leadgenId: string;
  formId?: string;
  pageId?: string;
  source: string;
  leadDetails?: any;
}) {
  let details = leadData.leadDetails;
  if (!details) {
    // If not passed in, try fetching via Graph API if page token available
    const accounts = await listMetaAccounts();
    const fbAccount = accounts.find(a => a.platform === 'FACEBOOK');
    if (fbAccount?.accessToken) {
      try {
        details = await fetchMetaLeadDetails(leadData.leadgenId, fbAccount.accessToken);
      } catch (e) {
        console.warn('Could not fetch lead details from Graph API, will use standard template fallback');
      }
    }
  }

  // Parse lead form fields
  let fullName = 'Meta Lead ' + leadData.leadgenId.slice(-4);
  let email = `lead.${leadData.leadgenId}@facebook.com`;
  let phone = '+1 (800) 555-0199';
  let message = `Imported from Meta Lead Ads (Form ID: ${leadData.formId || 'N/A'})`;
  let destination = 'Explore Worldwide Tours';

  if (details && details.field_data) {
    for (const field of details.field_data) {
      const name = (field.name || '').toLowerCase();
      const val = field.values?.[0] || '';
      if (name.includes('name')) fullName = val || fullName;
      if (name.includes('email') && val.includes('@')) email = val;
      if (name.includes('phone') || name.includes('number')) phone = val;
      if (name.includes('destination') || name.includes('location')) destination = val;
      if (name.includes('message') || name.includes('comment') || name.includes('interest')) message = val;
    }
  }

  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] || 'Meta';
  const lastName = nameParts.slice(1).join(' ') || 'Lead';

  try {
    // 1. Find or create Customer
    let customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          whatsappNumber: phone,
        }
      });
    }

    // 2. Prevent duplicate enquiry for the same customer within 24h for Meta
    const recentEnquiry = await prisma.enquiry.findFirst({
      where: {
        customerId: customer.id,
        source: { contains: 'Meta' },
        createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) }
      }
    });

    if (recentEnquiry) {
      console.log(`Duplicate lead prevented for customer ${customer.email}. Existing ref: ${recentEnquiry.referenceNumber}`);
      return recentEnquiry;
    }

    // 3. Generate Reference Number (format: UTC-YYYY/MM/DD-XXX)
    const referenceNumber = await generateUniqueEnquiryReference();

    // 4. Create Enquiry
    const enquiry = await prisma.enquiry.create({
      data: {
        referenceNumber,
        source: leadData.source || 'Facebook Lead Ad',
        status: 'NEW',
        customerId: customer.id,
        destination,
        message,
        preferredContact: 'WHATSAPP',
      }
    });

    // 5. Hybrid Automatic CRM Lead Assignment
    const pipelineStageId = await resolveDefaultPipelineStageId();

    const salesLead = await prisma.salesLead.create({
      data: {
        title: `Meta Lead: ${destination || 'General'} (${enquiry.referenceNumber})`,
        source: enquiry.source,
        status: 'NEW',
        customerId: customer.id,
        pipelineStageId,
        enquiryId: enquiry.id,
      }
    });

    const assignResult = await assignLeadAutomatically(salesLead.id).catch((err) => {
      console.error('Error auto-assigning Meta lead:', err);
      return null;
    });

    if (assignResult?.assignedTo?.id) {
      await prisma.enquiryAssignment.create({
        data: {
          enquiryId: enquiry.id,
          employeeId: assignResult.assignedTo.id,
        }
      }).catch(() => {});
    }

    return enquiry;
  } catch (err) {
    console.error('Error importing Meta lead to CRM:', err);
    throw err;
  }
}

/**
 * Record and link a Meta message to Enquiry / Customer.
 * Automatically creates or updates CRM Enquiry & SalesLead for incoming WhatsApp messages.
 */
async function recordMetaMessage(data: {
  platform: string;
  externalId?: string;
  senderId: string;
  senderName?: string;
  recipientId: string;
  direction: string;
  type?: string;
  content: string;
  templateName?: string;
  status: string;
  rawPayload?: any;
}) {
  try {
    let customer: any = null;

    if (data.platform === 'WHATSAPP') {
      const normalizedPhone = data.senderId.replace(/\D/g, '');
      const phoneFormatted = data.senderId.startsWith('+') ? data.senderId : `+${data.senderId}`;

      // 1. Find or create Customer by phone
      customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { whatsappNumber: { contains: normalizedPhone.slice(-10) } },
            { phone: { contains: normalizedPhone.slice(-10) } }
          ]
        }
      });

      if (!customer && data.direction === 'INBOUND') {
        const nameParts = (data.senderName || 'WhatsApp Traveller').trim().split(' ');
        const firstName = nameParts[0] || 'WhatsApp';
        const lastName = nameParts.slice(1).join(' ') || 'Traveller';
        customer = await prisma.customer.create({
          data: {
            firstName,
            lastName,
            email: `${normalizedPhone}@whatsapp.utctravel.com`,
            phone: phoneFormatted,
            whatsappNumber: phoneFormatted,
          }
        });
      }
    } else if (data.platform === 'INSTAGRAM') {
      const igsid = data.senderId;
      // 1. Find existing customer by previous MetaMessage with this Instagram senderId
      const prevMessage = await prisma.metaMessage.findFirst({
        where: {
          platform: 'INSTAGRAM',
          senderId: igsid,
          customerId: { not: null },
        },
        include: { customer: true }
      });

      if (prevMessage?.customer) {
        customer = prevMessage.customer;
      } else {
        // Fallback: check if customer was created with IG identifier email
        const igEmail = `ig_${igsid}@instagram.utctravel.com`;
        customer = await prisma.customer.findUnique({
          where: { email: igEmail }
        });
      }

      if (!customer && data.direction === 'INBOUND') {
        const igUsername = data.senderName || `instagram_user_${igsid.slice(-6)}`;
        customer = await prisma.customer.create({
          data: {
            firstName: igUsername,
            lastName: '(Instagram)',
            email: `ig_${igsid}@instagram.utctravel.com`,
            // Do NOT fabricate phone or whatsappNumber
          }
        });
      }
    }

    let enquiryId: string | undefined = undefined;

    // 2. Find active enquiry or create a new enquiry from inbound message
    if (customer) {
      const activeEnquiry = await prisma.enquiry.findFirst({
        where: {
          customerId: customer.id,
          status: { notIn: ['CLOSED', 'LOST', 'NOT_INTERESTED'] }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (activeEnquiry) {
        enquiryId = activeEnquiry.id;
      } else if (data.direction === 'INBOUND' && (data.platform === 'WHATSAPP' || data.platform === 'INSTAGRAM')) {
        const isInstagram = data.platform === 'INSTAGRAM';
        
        // Extract Meta Click-to-WhatsApp referral metadata (Campaign ID/Name, Ad ID/Name, Source URL)
        let sourceName = isInstagram ? 'Instagram DM' : 'WhatsApp Enquiry';
        let campaignAttributionNote = '';
        let resolvedDestination = isInstagram ? 'Instagram Inquiry' : 'General Enquiry';

        if (!isInstagram) {
          const attribution = await extractWhatsAppAttribution(data.rawPayload, data.rawPayload);
          sourceName = attribution.sourceTag;
          campaignAttributionNote = formatAttributionNotes(attribution);
          if (attribution.campaignName && attribution.campaignName !== 'Meta Ad') {
            resolvedDestination = attribution.campaignName;
          }
        }

        const referenceNumber = await generateUniqueEnquiryReference();

        const newEnquiry = await prisma.enquiry.create({
          data: {
            referenceNumber,
            source: sourceName,
            status: 'NEW',
            customerId: customer.id,
            destination: resolvedDestination,
            message: data.content || (isInstagram ? 'Incoming message via Instagram Direct' : 'Incoming message via WhatsApp'),
            preferredContact: isInstagram ? 'OTHER' : 'WHATSAPP',
          }
        });
        enquiryId = newEnquiry.id;

        // Auto-create matching SalesLead and trigger strict sequential Round Robin
        const pipelineStageId = await resolveDefaultPipelineStageId();

        const salesLead = await prisma.salesLead.create({
          data: {
            title: `${sourceName}: ${resolvedDestination} (${newEnquiry.referenceNumber})`,
            source: sourceName,
            status: 'NEW',
            customerId: customer.id,
            pipelineStageId,
            enquiryId: newEnquiry.id,
            requirements: campaignAttributionNote ? {
              create: {
                destination: resolvedDestination,
                notes: campaignAttributionNote,
              }
            } : undefined,
          }
        });

        // Add Activity Log for attribution tracking in timeline
        if (campaignAttributionNote) {
          await prisma.auditLog.create({
            data: {
              userId: null,
              userEmail: 'Meta Webhook Gateway',
              action: 'WHATSAPP_CAMPAIGN_ATTRIBUTION',
              module: 'Enquiries',
              recordId: newEnquiry.id,
              details: `Originating Campaign: ${sourceName}. ${campaignAttributionNote.replace(/\n/g, ' | ')}`,
            }
          }).catch(() => {});
        }

        const assignResult = await assignLeadAutomatically(salesLead.id).catch((err) => {
          console.error(`Error auto-assigning ${sourceName} lead:`, err);
          return null;
        });

        if (assignResult?.assignedTo?.id) {
          await prisma.enquiryAssignment.create({
            data: {
              enquiryId: newEnquiry.id,
              employeeId: assignResult.assignedTo.id,
            }
          }).catch(() => {});
        }
      }
    }

    return await prisma.metaMessage.create({
      data: {
        platform: data.platform,
        externalId: data.externalId,
        senderId: data.senderId,
        senderName: data.senderName,
        recipientId: data.recipientId,
        direction: data.direction,
        type: data.type || 'TEXT',
        content: data.content,
        templateName: data.templateName,
        status: data.status,
        customerId: customer?.id,
        enquiryId,
        rawPayload: data.rawPayload,
      }
    });
  } catch (err) {
    console.error('recordMetaMessage error:', err);
  }
}

/**
 * 7. POST /api/meta/whatsapp/send - Send WhatsApp message or template
 */
export async function sendWhatsAppMessageController(req: Request, res: Response): Promise<void> {
  try {
    const { to, text, templateName, languageCode, components, enquiryId, customerId } = req.body;

    if (!to) {
      res.status(400).json({ success: false, message: 'Recipient phone number (to) is required' });
      return;
    }

    // 1. Consent Validation
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

    // 2. WhatsApp 24-Hour Messaging Window Validation
    if (!templateName) {
      // Freeform text message: check if customer sent an inbound message in the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const normalizedTo = to.replace(/\D/g, '');
      const lastInbound = await prisma.metaMessage.findFirst({
        where: {
          platform: 'WHATSAPP',
          direction: 'INBOUND',
          senderId: { contains: normalizedTo.slice(-10) },
          createdAt: { gte: twentyFourHoursAgo }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!lastInbound) {
        res.status(400).json({
          success: false,
          code: 'OUTSIDE_24_HOUR_WINDOW',
          message: 'The 24-hour customer service messaging window has expired. Meta policy requires using an approved WhatsApp Message Template to initiate contact.',
        });
        return;
      }
    }

    const accounts = await listMetaAccounts();
    const waAccount = accounts.find(a => a.platform === 'WHATSAPP');
    const upgrowKey = getUpgrowApiKey();

    // If Upgrow WhatsApp is configured, dispatch through Upgrow Sales Flow
    if (upgrowKey) {
      const upgrowRes = await sendUpgrowWhatsAppMessage({
        to,
        text,
        type: templateName ? 'template' : 'text',
        templateName,
        enquiryId,
        customerId,
      });

      if (upgrowRes.success) {
        res.status(200).json({
          success: true,
          message: 'WhatsApp message dispatched successfully via Upgrow Sales Flow',
          data: {
            messageId: upgrowRes.messageId,
            recipient: to,
            status: upgrowRes.status,
          }
        });
        return;
      } else {
        res.status(400).json({
          success: false,
          message: upgrowRes.error || 'Failed to dispatch WhatsApp message via Upgrow',
        });
        return;
      }
    }

    const phoneNumberId = waAccount?.metadata?.phone_number_id || 'DEMO_PHONE_NUMBER_ID';
    const accessToken = waAccount?.accessToken || 'EAA_DEMO_WHATSAPP_TOKEN';

    const sendRes = await sendWhatsAppMessageApi({
      phoneNumberId,
      accessToken,
      to,
      type: templateName ? 'template' : 'text',
      text,
      templateName,
      languageCode: languageCode || 'en_US',
      components,
    });

    // Save outbound message in DB
    try {
      await prisma.metaMessage.create({
        data: {
          platform: 'WHATSAPP',
          externalId: sendRes.messageId,
          senderId: phoneNumberId,
          recipientId: to,
          direction: 'OUTBOUND',
          type: templateName ? 'TEMPLATE' : 'TEXT',
          content: templateName ? `Template: ${templateName}` : (text || ''),
          templateName,
          status: 'SENT',
          enquiryId: enquiryId || null,
          customerId: customerId || null,
        }
      });
    } catch (dbErr) {
      // Continue even if DB write fallback fails
    }

    res.status(200).json({
      success: true,
      message: 'WhatsApp message dispatched successfully',
      data: {
        messageId: sendRes.messageId,
        recipient: to,
        status: 'SENT',
      }
    });
  } catch (error: any) {
    console.error('sendWhatsAppMessageController error:', error);
    res.status(500).json({
      success: false,
      message: error?.response?.data?.error?.message || 'Failed to dispatch WhatsApp message',
    });
  }
}

/**
 * 7.1 GET /api/meta/whatsapp/templates - List approved WhatsApp templates
 */
export async function getWhatsAppTemplatesController(req: Request, res: Response): Promise<void> {
  try {
    const accounts = await listMetaAccounts();
    const waAccount = accounts.find(a => a.platform === 'WHATSAPP');
    const wabaId = waAccount?.accountId || (waAccount?.metadata as any)?.waba_id || '';
    const accessToken = waAccount?.accessToken || '';

    const templates = await fetchWhatsAppTemplates(wabaId, accessToken);
    res.status(200).json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    console.error('getWhatsAppTemplatesController error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve WhatsApp templates',
    });
  }
}

/**
 * 8. GET /api/meta/conversations - List WhatsApp / Messenger / Instagram conversations
 */
export async function getConversationsController(req: Request, res: Response): Promise<void> {
  try {
    const { platform = 'WHATSAPP', enquiryId, customerId, limit = 50 } = req.query;

    const where: any = {};
    if (platform) where.platform = String(platform).toUpperCase();
    if (enquiryId) where.enquiryId = String(enquiryId);
    if (customerId) where.customerId = String(customerId);

    let messages: any[] = [];
    try {
      messages = await prisma.metaMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        include: {
          enquiry: { select: { referenceNumber: true, destination: true } },
          customer: { select: { firstName: true, lastName: true, phone: true } }
        }
      });
    } catch (e) {
      messages = [];
    }

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error('getConversationsController error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve conversations' });
  }
}

/**
 * 9. POST /api/meta/capi/event - Receive browser pixel event and forward to Conversions API
 */
export async function trackCapiEventController(req: Request, res: Response): Promise<void> {
  try {
    const { eventName, eventId, eventSourceUrl, userData = {}, customData = {} } = req.body;

    if (!eventName || !eventId) {
      res.status(400).json({ success: false, message: 'eventName and eventId are required for deduplication' });
      return;
    }

    // Attach client IP and User Agent automatically from Express request
    const clientIpAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '';
    const clientUserAgent = req.headers['user-agent'] || '';

    const enrichedUserData = {
      ...userData,
      clientIpAddress,
      clientUserAgent,
    };

    const result = await sendConversionsApiEvent({
      eventName,
      eventId,
      eventSourceUrl: eventSourceUrl || req.headers.referer,
      userData: enrichedUserData,
      customData,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('trackCapiEventController error:', error);
    res.status(500).json({ success: false, message: 'Failed to record Conversions API event' });
  }
}

/**
 * 10. GET /api/meta/analytics - Meta Analytics and Performance Metrics
 */
export async function getMetaAnalyticsController(req: Request, res: Response): Promise<void> {
  try {
    const config = await getMetaConfig();
    const accounts = await listMetaAccounts();

    const fbAccount = accounts.find(a => a.platform === 'FACEBOOK' && a.status === 'CONNECTED');
    const igAccount = accounts.find(a => a.platform === 'INSTAGRAM' && a.status === 'CONNECTED');
    const waAccount = accounts.find(a => a.platform === 'WHATSAPP' && a.status === 'CONNECTED');
    const adAccount = accounts.find(a => a.platform === 'AD_ACCOUNT' && a.status === 'CONNECTED');

    const isFbConnected = !!(fbAccount && fbAccount.accessToken && !fbAccount.accessToken.startsWith('EAA_DEMO_'));
    const isIgConnected = !!(igAccount && igAccount.accessToken && !igAccount.accessToken.startsWith('EAA_DEMO_'));
    const isWaConnected = !!(waAccount && waAccount.accessToken && !waAccount.accessToken.startsWith('EAA_DEMO_'));
    const isAdAccountConnected = !!(adAccount && adAccount.accessToken && !adAccount.accessToken.startsWith('EAA_DEMO_'));

    let fbLeadsCount = 0;
    let igLeadsCount = 0;
    let waEnquiriesCount = 0;
    let totalMetaLeads = 0;

    // Strict validation: Only count leads if the respective channel is verified and connected,
    // and query only genuine webhook-verified Meta Leadgen events recorded by the integration.
    try {
      if (isFbConnected) {
        fbLeadsCount = await prisma.enquiry.count({
          where: {
            source: 'Facebook Lead Ad',
            referenceNumber: { not: { startsWith: 'SIM-' } }
          }
        });
      }

      if (isIgConnected) {
        igLeadsCount = await prisma.enquiry.count({
          where: {
            source: 'Instagram Lead Ad',
            referenceNumber: { not: { startsWith: 'SIM-' } }
          }
        });
      }

      if (isWaConnected) {
        waEnquiriesCount = await prisma.enquiry.count({
          where: {
            source: 'WhatsApp Enquiry',
            referenceNumber: { not: { startsWith: 'SIM-' } }
          }
        });
      }

      totalMetaLeads = fbLeadsCount + igLeadsCount + waEnquiriesCount;
    } catch (e) {
      console.error('Error querying DB enquiry counts for Meta Analytics:', e);
      fbLeadsCount = 0;
      igLeadsCount = 0;
      waEnquiriesCount = 0;
      totalMetaLeads = 0;
    }

    let campaigns: Array<{
      id: string;
      name: string;
      platform: string;
      status: string;
      leads: number;
      spend: string;
      cpl: string;
      conversions: number;
    }> = [];

    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let adAccountError: string | null = null;

    // If an Ad Account or Facebook Page is connected with live token, fetch real insights
    const activeTokenAccount = adAccount || fbAccount;
    if (activeTokenAccount && activeTokenAccount.accessToken && !activeTokenAccount.accessToken.startsWith('EAA_DEMO_')) {
      try {
        const rawToken = decryptToken(activeTokenAccount.accessToken);
        const targetId = activeTokenAccount.accountId.startsWith('act_') ? activeTokenAccount.accountId : `act_${activeTokenAccount.accountId}`;
        const campaignsUrl = `${GRAPH_API_BASE}/${targetId}/campaigns?fields=id,name,status,objective&access_token=${encodeURIComponent(rawToken)}`;
        const campaignsRes = await fetchJson(campaignsUrl);

        if (campaignsRes?.data && Array.isArray(campaignsRes.data)) {
          for (const camp of campaignsRes.data) {
            let campSpend = 0;
            let campImpressions = 0;
            let campClicks = 0;
            let campLeads = 0;

            try {
              const insightsUrl = `${GRAPH_API_BASE}/${camp.id}/insights?fields=spend,impressions,clicks,actions&access_token=${encodeURIComponent(rawToken)}`;
              const insRes = await fetchJson(insightsUrl);
              const insData = insRes?.data?.[0];
              if (insData) {
                campSpend = parseFloat(insData.spend || '0') || 0;
                campImpressions = parseInt(insData.impressions || '0', 10) || 0;
                campClicks = parseInt(insData.clicks || '0', 10) || 0;

                const leadAction = insData.actions?.find((a: any) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped');
                if (leadAction) {
                  campLeads = parseInt(leadAction.value || '0', 10) || 0;
                }

                totalSpend += campSpend;
                totalImpressions += campImpressions;
                totalClicks += campClicks;
              }
            } catch (insErr: any) {
              console.warn(`Failed to fetch insights for campaign ${camp.id}:`, insErr?.response?.data || insErr.message);
            }

            const cplValue = campLeads > 0 ? (campSpend / campLeads) : 0;
            campaigns.push({
              id: camp.id,
              name: camp.name,
              platform: 'FACEBOOK_IG',
              status: camp.status || 'ACTIVE',
              leads: campLeads,
              spend: '₹' + campSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              cpl: campLeads > 0 ? '₹' + cplValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A',
              conversions: campLeads,
            });
          }
        }
      } catch (err: any) {
        adAccountError = err?.response?.data?.error?.message || err.message || 'Error fetching Meta Ad Insights';
        console.error('Error fetching live Meta Ad Campaigns:', adAccountError);
      }
    }

    // Lead source breakdown based strictly on real DB counts
    const leadSourceBreakdown = [
      {
        source: 'Facebook Lead Ads',
        count: fbLeadsCount,
        percentage: totalMetaLeads > 0 ? Math.round((fbLeadsCount / totalMetaLeads) * 100) : 0
      },
      {
        source: 'Instagram Direct / Stories',
        count: igLeadsCount,
        percentage: totalMetaLeads > 0 ? Math.round((igLeadsCount / totalMetaLeads) * 100) : 0
      },
      {
        source: 'WhatsApp Click-to-Chat',
        count: waEnquiriesCount,
        percentage: totalMetaLeads > 0 ? Math.round((waEnquiriesCount / totalMetaLeads) * 100) : 0
      },
    ];

    // Real CAPI and deduplicated events from MetaProcessedEvent table
    let pixelConversions: Array<{ event: string; count: number }> = [];
    let deduplicationEventCount = 0;
    try {
      const eventGroup = await prisma.metaProcessedEvent.groupBy({
        by: ['eventType'],
        _count: {
          id: true,
        }
      });

      pixelConversions = eventGroup.map(eg => ({
        event: eg.eventType,
        count: eg._count.id,
      }));

      deduplicationEventCount = pixelConversions.reduce((acc, curr) => acc + curr.count, 0);
    } catch (dbErr) {
      console.warn('Unable to query MetaProcessedEvent for conversions:', dbErr);
      pixelConversions = [];
      deduplicationEventCount = 0;
    }

    const hasRealPixelConfig = Boolean(config?.pixelId && config.trackPixel);
    const hasRealCapiConfig = Boolean(
      config?.trackCapi &&
      config.capiAccessToken &&
      !decryptToken(config.capiAccessToken).startsWith('EAA_DEMO_')
    );
    const isDeduplicationActive = Boolean(hasRealPixelConfig && hasRealCapiConfig);

    // Summary calculation
    const overallCtr = totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%'
      : '0.00%';

    const costPerLeadDisplay = fbLeadsCount > 0 && totalSpend > 0
      ? '₹' + (totalSpend / fbLeadsCount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : (isAdAccountConnected ? 'N/A' : 'Not Connected');

    const spendDisplay = isAdAccountConnected
      ? '₹' + totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : 'Not Connected';

    res.status(200).json({
      success: true,
      data: {
        isLiveMode: Boolean(config?.isLive),
        connections: {
          facebook: isFbConnected,
          instagram: isIgConnected,
          whatsapp: isWaConnected,
          adAccount: isAdAccountConnected,
        },
        deduplication: {
          isActive: isDeduplicationActive,
          statusText: isDeduplicationActive ? 'Event Deduplication Active' : 'Deduplication Not Configured',
          hasPixel: hasRealPixelConfig,
          hasCapi: hasRealCapiConfig,
          totalProcessedEvents: deduplicationEventCount,
        },
        error: adAccountError,
        summary: {
          facebookLeads: fbLeadsCount,
          instagramLeads: igLeadsCount,
          whatsAppEnquiries: waEnquiriesCount,
          totalMetaLeads: totalMetaLeads,
          conversionsCount: deduplicationEventCount,
          costPerLead: costPerLeadDisplay,
          spend: spendDisplay,
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: overallCtr,
        },
        campaigns,
        leadSourceBreakdown,
        pixelConversions,
      }
    });
  } catch (error: any) {
    console.error('getMetaAnalyticsController error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve Meta analytics' });
  }
}

/**
 * 11. POST /api/meta/simulate-lead - Sandbox lead generation simulator for client testing
 */
export async function simulateMetaLeadController(req: Request, res: Response): Promise<void> {
  try {
    const { platform = 'FACEBOOK', fullName, email, phone, destination, message } = req.body;
    const fakeLeadgenId = 'sim_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    const simulatedLead = await processMetaLead({
      leadgenId: fakeLeadgenId,
      formId: 'SIMULATED_TEST_FORM_01',
      source: platform === 'INSTAGRAM' ? 'Instagram Lead Ad' : 'Facebook Lead Ad',
      leadDetails: {
        field_data: [
          { name: 'full_name', values: [fullName || 'Alexandre Dupont'] },
          { name: 'email', values: [email || ('alexandre.' + Date.now().toString().slice(-4) + '@example.com')] },
          { name: 'phone_number', values: [phone || '+1 415 555 2671'] },
          { name: 'destination', values: [destination || 'Kandy & Cultural Triangle Safari'] },
          { name: 'message', values: [message || 'Interested in private 5-star holiday package for 2 adults.'] }
        ]
      }
    });

    res.status(200).json({
      success: true,
      message: 'Simulated Meta Lead imported directly into CRM enquiry queue!',
      data: simulatedLead,
    });
  } catch (error: any) {
    console.error('simulateMetaLeadController error:', error);
    res.status(500).json({ success: false, message: error.message || 'Simulation failed' });
  }
}
