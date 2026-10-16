import { Router } from 'express';
import { submitEnquiry, getEnquiries, updateEnquiryStatus, deleteEnquiry } from '../controllers/contactController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();
const adminRoles = authorizeRole(['ADMIN', 'SUPER_ADMIN', 'CEO']);

// Public route for form submission
router.post('/', submitEnquiry);

// Admin CRM routes
router.get('/', authenticate, adminRoles, getEnquiries);
router.patch('/:id/status', authenticate, adminRoles, updateEnquiryStatus);
router.delete('/:id', authenticate, adminRoles, deleteEnquiry);

export default router;
