import { Router } from 'express';
import {
  submitEnquiry,
  listEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  addNote,
  scheduleFollowUp,
  updateFollowUp,
  getDashboardStats,
  deleteEnquiry,
} from '../controllers/crmEnquiryController';
import { authenticate, requireModuleAccess } from '../middleware/authMiddleware';

const router = Router();

// ─── Public Routes (Website → Database) ──────────────────────────────────────
// No auth required — used by the public website enquiry forms
router.post('/submit', submitEnquiry);

// ─── CRM Read Routes ─────────────────────────────────────────────────────────
router.get('/stats', authenticate, requireModuleAccess('Enquiries'), getDashboardStats);
router.get('/', authenticate, requireModuleAccess('Enquiries'), listEnquiries);
router.get('/:id', authenticate, requireModuleAccess('Enquiries'), getEnquiryById);

// ─── CRM Write Routes (protected) ─────────────────────────────────────────────
router.patch('/:id/status', authenticate, requireModuleAccess('Enquiries'), updateEnquiryStatus);
router.post('/:id/notes', authenticate, requireModuleAccess('Enquiries'), addNote);
router.post('/:id/followups', authenticate, requireModuleAccess('Enquiries'), scheduleFollowUp);
router.patch('/followups/:followUpId', authenticate, requireModuleAccess('Enquiries'), updateFollowUp);
router.patch('/:id/followups/:followUpId', authenticate, requireModuleAccess('Enquiries'), updateFollowUp);
router.delete('/:id', authenticate, requireModuleAccess('Enquiries'), deleteEnquiry);

export default router;
