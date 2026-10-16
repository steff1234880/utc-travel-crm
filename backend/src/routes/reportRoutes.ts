import { Router } from 'express';
import { exportReportCSV } from '../controllers/reportController';
import { authenticate, requireModuleAccess } from '../middleware/authMiddleware';

const router = Router();

// Export endpoint
router.get('/export', authenticate, requireModuleAccess('Reports'), exportReportCSV);

export default router;
