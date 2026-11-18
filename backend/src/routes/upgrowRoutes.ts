import { Router } from 'express';
import {
  verifyUpgrowWebhookController,
  handleUpgrowWebhookController,
  sendUpgrowWhatsAppMessageController,
  getUpgrowStatusController,
} from '../controllers/upgrowWhatsAppController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// ==========================================
// 1. Incoming Webhook Endpoints from Upgrow Sales Flow (Public for Webhook Dispatch)
// ==========================================
router.get('/webhook', verifyUpgrowWebhookController);
router.post('/webhook', handleUpgrowWebhookController);

// ==========================================
// 2. Protected Outbound Messaging & Service Status (Authenticated CRM Users)
// ==========================================
router.get('/status', authenticate, getUpgrowStatusController);
router.post('/send', authenticate, sendUpgrowWhatsAppMessageController);

export default router;

