import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { getGlobalCalendar, toggleGlobalCalendar, getAvailableTripsByDate } from '../controllers/globalCalendarController';
import { authenticateJWT, authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJWT, getDashboardStats);
router.get('/calendar', getGlobalCalendar); // Public endpoint for home page
router.get('/calendar/trips', getAvailableTripsByDate); // Public endpoint for fetching available trips by date
router.post('/calendar/toggle', authenticate, authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']), toggleGlobalCalendar);

export default router;
