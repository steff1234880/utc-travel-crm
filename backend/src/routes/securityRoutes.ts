import { Router } from 'express';
import { getSecuritySettings, updateSecuritySettings } from '../controllers/securitySettingsController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/settings', authenticate, authorizeRole(['CEO / Super Admin', 'Admin']), getSecuritySettings);
router.patch('/settings', authenticate, authorizeRole(['CEO / Super Admin', 'Admin']), updateSecuritySettings);

export default router;
