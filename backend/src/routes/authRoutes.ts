import { Router } from 'express';
import { login, logout, getMe, updatePassword, register, setupAdmin } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.patch('/password', authenticate, updatePassword);
router.post('/register', register);
router.post('/setup-admin', setupAdmin);

export default router;
