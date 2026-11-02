import { Router } from 'express';
import {
  getOAuthUrlController,
  handleOAuthCallbackController,
  getMetaConfigController,
  updateMetaConfigController,
  connectAccountController,
  disconnectAccountController,
  verifyWebhookController,
  handleWebhookEventController,
  sendWhatsAppMessageController,
  getConversationsController,
  trackCapiEventController,
  getMetaAnalyticsController,
  simulateMetaLeadController,
} from '../controllers/metaController';
import { authenticate, requireModuleAccess } from '../middleware/authMiddleware';

const router = Router();

// ==========================================
// 1. Meta Webhook Endpoints (Public for Meta verification & updates)
// ==========================================
router.get('/webhook', verifyWebhookController);
router.post('/webhook', handleWebhookEventController);

// ==========================================
// 2. Browser Pixel to Server CAPI Bridge (Public/Client tracking)
// ==========================================
router.post('/capi/event', trackCapiEventController);

// ==========================================
// 3. Protected Meta Integration Management (RBAC: System Settings / Marketing)
// ==========================================
router.get('/config', authenticate, requireModuleAccess('System Settings'), getMetaConfigController);
router.patch('/config', authenticate, requireModuleAccess('System Settings'), updateMetaConfigController);
router.get('/oauth/url', authenticate, requireModuleAccess('System Settings'), getOAuthUrlController);
router.post('/oauth/callback', authenticate, requireModuleAccess('System Settings'), handleOAuthCallbackController);
router.post('/connect', authenticate, requireModuleAccess('System Settings'), connectAccountController);
router.post('/disconnect', authenticate, requireModuleAccess('System Settings'), disconnectAccountController);

// ==========================================
// 4. WhatsApp & Omni Messaging (Enquiries / Sales CRM)
// ==========================================
router.get('/conversations', authenticate, getConversationsController);
router.post('/whatsapp/send', authenticate, sendWhatsAppMessageController);

// ==========================================
// 5. Meta Analytics & Simulator
// ==========================================
router.get('/analytics', authenticate, getMetaAnalyticsController);
router.post('/simulate-lead', authenticate, simulateMetaLeadController);

export default router;

