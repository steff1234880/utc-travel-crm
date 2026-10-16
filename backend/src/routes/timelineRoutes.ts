import { Router } from 'express';
import { getTimeline } from '../controllers/timelineController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/:entityType/:entityId', authenticate, getTimeline);

export default router;
