import { Router } from 'express';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customerController';
import { authenticate, requireModuleAccess, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, requireModuleAccess('Customers'), getCustomers);
router.get('/:id', authenticate, requireModuleAccess('Customers'), getCustomerById);
router.post('/', authenticate, authorizeRole(['ADMIN', 'SUPER_ADMIN', 'Sales Manager', 'Sales Executive']), createCustomer);
router.patch('/:id', authenticate, authorizeRole(['ADMIN', 'SUPER_ADMIN', 'Sales Manager', 'Sales Executive']), updateCustomer);
router.delete('/:id', authenticate, authorizeRole(['ADMIN', 'SUPER_ADMIN', 'Sales Manager']), deleteCustomer);

export default router;

