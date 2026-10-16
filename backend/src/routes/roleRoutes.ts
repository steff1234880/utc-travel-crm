import { Router } from 'express';
import { getRoles, getRoleById, createRole, updateRole, deleteRole } from '../controllers/roleController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, authorizeRole(['CEO / Super Admin', 'Admin', 'HR Manager']), getRoles);
router.get('/:id', authenticate, authorizeRole(['CEO / Super Admin', 'Admin', 'HR Manager']), getRoleById);
router.post('/', authenticate, authorizeRole(['CEO / Super Admin', 'Admin']), createRole);
router.patch('/:id', authenticate, authorizeRole(['CEO / Super Admin', 'Admin']), updateRole);
router.delete('/:id', authenticate, authorizeRole(['CEO / Super Admin', 'Admin']), deleteRole);

export default router;
