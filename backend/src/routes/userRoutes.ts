import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, toggleUserStatus, resetUserPassword } from '../controllers/userController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, authorizeRole(['CEO / Super Admin', 'Admin', 'HR Manager']), getUsers);
router.get('/:id', authenticate, authorizeRole(['CEO / Super Admin', 'Admin', 'HR Manager']), getUserById);
router.post('/', authenticate, authorizeRole(['CEO / Super Admin', 'Admin', 'HR Manager']), createUser);
router.patch('/:id', authenticate, authorizeRole(['CEO / Super Admin', 'Admin', 'HR Manager']), updateUser);
router.patch('/:id/status', authenticate, authorizeRole(['CEO / Super Admin', 'Admin']), toggleUserStatus);
router.post('/:id/reset-password', authenticate, authorizeRole(['CEO / Super Admin', 'Admin']), resetUserPassword);

export default router;
