import { Router } from 'express';
import { getPermissions } from '../controllers/roleController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, getPermissions);

export default router;
