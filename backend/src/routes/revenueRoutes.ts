import { Router } from 'express';
import { 
  createRevenueRecord, 
  getRevenueRecords, 
  getRevenueSummary,
  getRevenueReports,
  getRevenueDetails,
  updateRevenueRecord 
} from '../controllers/revenueController';
import { authenticate, requireModuleAccess } from '../middleware/authMiddleware';

const router = Router();

router.get('/summary', authenticate, requireModuleAccess('Accounting'), getRevenueSummary);
router.get('/reports', authenticate, requireModuleAccess('Accounting'), getRevenueReports);

router.post('/', authenticate, requireModuleAccess('Accounting'), createRevenueRecord);
router.get('/', authenticate, requireModuleAccess('Accounting'), getRevenueRecords);

router.get('/:id', authenticate, requireModuleAccess('Accounting'), getRevenueDetails);
router.put('/:id', authenticate, requireModuleAccess('Accounting'), updateRevenueRecord);

export default router;
