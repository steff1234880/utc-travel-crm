import { Router } from 'express';
import { authenticate, requireModuleAccess } from '../middleware/authMiddleware';
import {
  getPublicGroupToursCalendar,
  getPublicGroupTourById,
  joinGroupTour,
  getAdminGroupTours,
  createGroupTour,
  updateGroupTour,
  deleteGroupTour,
} from '../controllers/groupTourController';

const router = Router();

// Public Routes (No authentication required)
router.get('/calendar', getPublicGroupToursCalendar);
router.get('/public/:id', getPublicGroupTourById);
router.post('/public/:id/join', joinGroupTour);

// Protected Admin Routes (Requires Authentication)
router.use(authenticate, requireModuleAccess('Operations'));
router.get('/admin/list', getAdminGroupTours);
router.post('/admin/create', createGroupTour);
router.put('/admin/:id', updateGroupTour);
router.delete('/admin/:id', deleteGroupTour);

export default router;
