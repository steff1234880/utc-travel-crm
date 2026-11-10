import { Router } from 'express';
import {
  getPerformanceScores,
  getEmployeePerformanceDetail,
  getMyPerformance,
  createOrUpdateIncentive,
  updateIncentiveStatus,
  processIncentivePayout,
  getAllIncentivePayouts
} from '../controllers/incentiveController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// 1. Employee self-service view: View own monthly score and awarded incentives
router.get('/my-performance', authenticate, getMyPerformance);

// 2. Department-wise and Admin monthly performance score overview
router.get(
  '/performance',
  authenticate,
  authorizeRole(['CEO / Super Admin', 'SUPER_ADMIN', 'Admin', 'ADMIN', 'HR_MANAGER', 'SALES_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER']),
  getPerformanceScores
);

// 3. Individual employee performance history and incentive review
router.get('/employee/:id', authenticate, getEmployeePerformanceDetail);

// 4. Admin / CEO sets or edits the manual incentive amount and remarks
router.post(
  '/create-or-update',
  authenticate,
  authorizeRole(['CEO / Super Admin', 'SUPER_ADMIN', 'Admin', 'ADMIN']),
  createOrUpdateIncentive
);

// 5. Admin / CEO approves or rejects the incentive request
router.patch(
  '/:id/status',
  authenticate,
  authorizeRole(['CEO / Super Admin', 'SUPER_ADMIN', 'Admin', 'ADMIN']),
  updateIncentiveStatus
);

// 6. Accountant processes payout for approved incentives
router.post(
  '/:id/payout',
  authenticate,
  authorizeRole(['CEO / Super Admin', 'SUPER_ADMIN', 'Admin', 'ADMIN', 'ACCOUNTANT', 'FINANCE_MANAGER']),
  processIncentivePayout
);

// 7. Accounting view: All incentive liabilities & paid records
router.get(
  '/payouts',
  authenticate,
  authorizeRole(['CEO / Super Admin', 'SUPER_ADMIN', 'Admin', 'ADMIN', 'ACCOUNTANT', 'FINANCE_MANAGER', 'HR_MANAGER']),
  getAllIncentivePayouts
);

export default router;

