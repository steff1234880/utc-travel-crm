import { Router } from 'express';
import { getDashboard, processSalaryPayment, processBonusPayment, processIncentivePayment, createIncentiveRecord } from '../controllers/payrollAccountingController';
import { authenticate, requireModuleAccess } from '../middleware/authMiddleware';

const router = Router();

// Dashboard - Accounting / Salary Module
router.get('/dashboard', authenticate, requireModuleAccess('Salary'), getDashboard);

// Payment Actions
router.patch('/salary/:id/pay', authenticate, requireModuleAccess('Salary'), processSalaryPayment);
router.patch('/bonus/:id/pay', authenticate, requireModuleAccess('Salary'), processBonusPayment);
router.patch('/incentive/:id/pay', authenticate, requireModuleAccess('Salary'), processIncentivePayment);

// Create Incentive / Commission record
router.post('/incentive/create', authenticate, requireModuleAccess('Salary'), createIncentiveRecord);

export default router;
