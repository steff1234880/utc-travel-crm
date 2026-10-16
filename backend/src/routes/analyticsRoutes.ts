import { Router } from 'express';
import {
  getCEOOverviewMetrics,
  getSalesAnalytics,
  getPackageAnalytics,
  getFinancialAnalytics,
  getEmployeeAnalytics,
  getOperationsAnalytics,
  getFilterOptions,
  exportAnalyticsCSV
} from '../controllers/analyticsController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// Allowed roles for CEO Dashboard & Analytics
const allowedDashboardRoles = authorizeRole([
  'CEO',
  'SUPER_ADMIN',
  'ADMIN',
  'SALES_MANAGER',
  'ACCOUNTANT',
  'OPERATIONS_MANAGER',
  'HR_MANAGER'
]);

router.use(authenticate, allowedDashboardRoles);

router.get('/overview', getCEOOverviewMetrics);
router.get('/sales', getSalesAnalytics);
router.get('/packages', getPackageAnalytics);
router.get('/financials', getFinancialAnalytics);
router.get('/employees', getEmployeeAnalytics);
router.get('/operations', getOperationsAnalytics);
router.get('/filters', getFilterOptions);
router.get('/export', exportAnalyticsCSV);

export default router;
