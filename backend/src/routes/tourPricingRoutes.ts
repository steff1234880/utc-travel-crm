import { Router } from 'express';
import { getTourPricing, updateTourPricing } from '../controllers/tourPricingController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();
router.get('/', getTourPricing);
router.put('/:id', authenticate, updateTourPricing);

export default router;
