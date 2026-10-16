import { Router } from 'express';
import { getTransactions, getExpenseCategories, getDashboardSummary, getFinancialTrends } from '../controllers/accountingController';
import { deletePayment } from '../controllers/paymentController';
import { authenticate, requireModuleAccess } from '../middleware/authMiddleware';

const router = Router();

// ─── ACCOUNTING ROUTES ────────────────────────────────────────────────────────
// Strictly isolated from general sales access

router.get(
  '/dashboard',
  authenticate,
  requireModuleAccess('Accounting'),
  getDashboardSummary
);

router.get(
  '/trends',
  authenticate,
  requireModuleAccess('Accounting'),
  getFinancialTrends
);

router.get(
  '/transactions',
  authenticate,
  requireModuleAccess('Accounting'),
  getTransactions
);

router.delete(
  '/transactions/:id',
  authenticate,
  requireModuleAccess('Accounting'),
  deletePayment
);

router.get(
  '/expenses/categories',
  authenticate,
  requireModuleAccess('Accounting'),
  getExpenseCategories
);

export default router;
