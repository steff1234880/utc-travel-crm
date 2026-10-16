import { Router } from 'express';
import { getAuditLogs, getAuditLogById, getLoginActivities } from '../controllers/auditController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, authorizeRole(['CEO / Super Admin', 'Admin']), getAuditLogs);
router.get('/login-activities', authenticate, authorizeRole(['CEO / Super Admin', 'Admin']), getLoginActivities);
router.get('/:id', authenticate, authorizeRole(['CEO / Super Admin', 'Admin']), getAuditLogById);

export default router;
