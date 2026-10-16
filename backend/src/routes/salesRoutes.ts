import { Router } from 'express';
import { getSalesDashboardMetrics, getSalesPipeline, getBookingPreparations, getBookingPreparationById } from '../controllers/salesController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/dashboard', authenticate, authorizeRole(['ADMIN', 'SUPER_ADMIN', 'Sales Manager', 'Sales Executive']), getSalesDashboardMetrics);
router.get('/pipeline', authenticate, authorizeRole(['ADMIN', 'SUPER_ADMIN', 'Sales Manager', 'Sales Executive']), getSalesPipeline);
router.get('/bookings/preparations', authenticate, getBookingPreparations);
router.get('/bookings/preparations/:id', authenticate, getBookingPreparationById);

export default router;

