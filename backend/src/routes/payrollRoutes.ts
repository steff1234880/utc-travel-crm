import { Router } from 'express';
import {
  getPayrollDashboard,
  getSalaryStructures,
  upsertSalaryStructure,
  processMonthlyPayroll,
  updateSalaryRecordStatus
} from '../controllers/payrollController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

const hrRoles = ['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN'];

router.get('/', authenticate, authorizeRole(hrRoles), getPayrollDashboard);
router.get('/structures', authenticate, authorizeRole(hrRoles), getSalaryStructures);
router.post('/structure', authenticate, authorizeRole(hrRoles), upsertSalaryStructure);
router.post('/process', authenticate, authorizeRole(hrRoles), processMonthlyPayroll);
router.patch('/records/:id', authenticate, authorizeRole(hrRoles), updateSalaryRecordStatus);

export default router;
