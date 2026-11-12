import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLeadStage,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  updateLead,
  deleteLead,
  getEligibleSalesExecutivesController,
  getLeadAssignmentOverviewController,
  assignLeadController,
  getLeadAssignmentHistoryController,
  getAssignmentSettingsController,
  updateAssignmentSettingsController
} from '../controllers/leadController';
import { authenticate, requireModuleAccess, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// Lead Assignment Management Routes (must precede /:id)
const managerAndAdminRoles = authorizeRole(['Sales Manager', 'CEO / Super Admin', 'Admin', 'ADMIN', 'SUPER_ADMIN']);
const adminOnlyRoles = authorizeRole(['CEO / Super Admin', 'Admin', 'ADMIN', 'SUPER_ADMIN']);

router.get('/assignment/overview', authenticate, managerAndAdminRoles, getLeadAssignmentOverviewController);
router.get('/assignment/executives', authenticate, requireModuleAccess('Sales CRM'), getEligibleSalesExecutivesController);
router.get('/assignment/settings', authenticate, managerAndAdminRoles, getAssignmentSettingsController);
router.patch('/assignment/settings', authenticate, adminOnlyRoles, updateAssignmentSettingsController);

router.get('/', authenticate, requireModuleAccess('Sales CRM'), getLeads);
router.get('/:id', authenticate, requireModuleAccess('Sales CRM'), getLeadById);
router.post('/', authenticate, requireModuleAccess('Sales CRM'), createLead);
router.patch('/:id', authenticate, requireModuleAccess('Sales CRM'), updateLead);
router.delete('/:id', authenticate, requireModuleAccess('Sales CRM'), deleteLead);
router.patch('/:id/stage', authenticate, requireModuleAccess('Sales CRM'), updateLeadStage);

// Lead Assignment Actions
router.post('/:id/assign', authenticate, managerAndAdminRoles, assignLeadController);
router.get('/:id/assignment-history', authenticate, requireModuleAccess('Sales CRM'), getLeadAssignmentHistoryController);

// Follow-up routes
router.post('/:id/followups', authenticate, requireModuleAccess('Sales CRM'), createFollowUp);
router.patch('/:id/followups/:followUpId', authenticate, requireModuleAccess('Sales CRM'), updateFollowUp);
router.delete('/:id/followups/:followUpId', authenticate, requireModuleAccess('Sales CRM'), deleteFollowUp);

export default router;
