import { Router } from 'express';
import { getGstConfig, updateGstConfig, getGstDashboard, getGstRecords } from '../controllers/gstController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// Settings - Admin & CEO only
router.get('/config', authenticate, authorizeRole(['ADMIN', 'SUPER_ADMIN', 'CEO']), getGstConfig);
router.put('/config', authenticate, authorizeRole(['ADMIN', 'SUPER_ADMIN', 'CEO']), updateGstConfig);

// Reports & Records - Admin, CEO, Accountant
router.get('/dashboard', authenticate, authorizeRole(['ADMIN', 'SUPER_ADMIN', 'CEO', 'ACCOUNTANT']), getGstDashboard);
router.get('/records', authenticate, authorizeRole(['ADMIN', 'SUPER_ADMIN', 'CEO', 'ACCOUNTANT']), getGstRecords);

export default router;
