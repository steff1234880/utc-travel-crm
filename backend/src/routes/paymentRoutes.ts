import { Router } from 'express';
import { 
  createPayment, 
  getPayments, 
  getPaymentDetails, 
  createRefund,
  getRefunds,
  cancelRefund, 
  getOutstandingBalance,
  deletePayment,
  getPayableQuotations,
  updatePayment
} from '../controllers/paymentController';
import { authenticate, requireModuleAccess } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticate, requireModuleAccess('Payments'), createPayment);
router.get('/', authenticate, requireModuleAccess('Payments'), getPayments);
router.get('/refunds', authenticate, requireModuleAccess('Accounting'), getRefunds);
router.post('/refunds', authenticate, requireModuleAccess('Accounting'), createRefund);
router.patch('/refunds/:id/cancel', authenticate, requireModuleAccess('Accounting'), cancelRefund);
// Must be before /:id to avoid route shadowing
router.get('/payable-quotations', authenticate, requireModuleAccess('Payments'), getPayableQuotations);
router.get('/balance/:quotationId', authenticate, requireModuleAccess('Payments'), getOutstandingBalance);
router.get('/:id', authenticate, requireModuleAccess('Payments'), getPaymentDetails);
router.put('/:id', authenticate, requireModuleAccess('Payments'), updatePayment);
router.delete('/:id', authenticate, requireModuleAccess('Payments'), deletePayment);

export default router;
