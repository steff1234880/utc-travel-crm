import { Router } from 'express';
import { getPnLDashboard, getPnLStatement } from '../controllers/pnlController';
import { authenticate, requireModuleAccess } from '../middleware/authMiddleware';

const router = Router();

// Dashboard - Accounting Module
router.get('/dashboard', authenticate, requireModuleAccess('Accounting'), getPnLDashboard);
router.get('/statement', authenticate, requireModuleAccess('Accounting'), getPnLStatement);

export default router;
