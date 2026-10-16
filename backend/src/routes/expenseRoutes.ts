import { Router } from 'express';
import { getExpenseCategories, createExpenseCategory, updateExpenseCategory } from '../controllers/expenseCategoryController';
import { createExpense, updateExpense, updateExpenseStatus, getExpenses, getExpenseDashboard, deleteExpense } from '../controllers/expenseController';
import { authenticate, requireModuleAccess, requirePermission, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// Dashboard - Expenses Module
router.get('/dashboard', authenticate, requireModuleAccess('Expenses'), getExpenseDashboard);

// Categories
router.get('/categories', authenticate, requireModuleAccess('Expenses'), getExpenseCategories);
router.post('/categories', authenticate, requireModuleAccess('Expenses'), createExpenseCategory);
router.put('/categories/:id', authenticate, requireModuleAccess('Expenses'), updateExpenseCategory);

// Expenses
router.post('/', authenticate, requireModuleAccess('Expenses'), createExpense);
router.get('/', authenticate, requireModuleAccess('Expenses'), getExpenses);
router.put('/:id', authenticate, requireModuleAccess('Expenses'), updateExpense);
router.patch('/:id/status', authenticate, requireModuleAccess('Expenses'), updateExpenseStatus);
router.delete('/:id', authenticate, requirePermission('expenses:delete'), deleteExpense);

export default router;
