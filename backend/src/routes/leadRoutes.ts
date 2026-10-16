import { Router } from 'express';
import { getLeads, getLeadById, createLead, updateLeadStage, createFollowUp, updateFollowUp, deleteFollowUp, updateLead, deleteLead } from '../controllers/leadController';
import { authenticate, requireModuleAccess } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, requireModuleAccess('Sales CRM'), getLeads);
router.get('/:id', authenticate, requireModuleAccess('Sales CRM'), getLeadById);
router.post('/', authenticate, requireModuleAccess('Sales CRM'), createLead);
router.patch('/:id', authenticate, requireModuleAccess('Sales CRM'), updateLead);
router.delete('/:id', authenticate, requireModuleAccess('Sales CRM'), deleteLead);
router.patch('/:id/stage', authenticate, requireModuleAccess('Sales CRM'), updateLeadStage);

// Follow-up routes
router.post('/:id/followups', authenticate, requireModuleAccess('Sales CRM'), createFollowUp);
router.patch('/:id/followups/:followUpId', authenticate, requireModuleAccess('Sales CRM'), updateFollowUp);
router.delete('/:id/followups/:followUpId', authenticate, requireModuleAccess('Sales CRM'), deleteFollowUp);

export default router;
