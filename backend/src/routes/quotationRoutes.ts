import { Router } from 'express';
import { createQuotation, getQuotations, getQuotationById, updateQuotationStatus, generateQuotationPdf, getQuotationsByLeadId, updateQuotation, deleteQuotation, getPublicQuotation, respondToQuotation, convertQuotationToBooking } from '../controllers/quotationController';
import { authenticate, requireModuleAccess } from '../middleware/authMiddleware';

const router = Router();

// Public endpoints (no authentication required)
router.get('/public/:id', getPublicQuotation);
router.post('/public/:id/respond', respondToQuotation);

// Protected endpoints
router.post('/', authenticate, requireModuleAccess('Quotations'), createQuotation);
router.get('/', authenticate, requireModuleAccess('Quotations'), getQuotations);
router.get('/lead/:leadId', authenticate, requireModuleAccess('Quotations'), getQuotationsByLeadId);
router.get('/:id', authenticate, requireModuleAccess('Quotations'), getQuotationById);
router.put('/:id', authenticate, requireModuleAccess('Quotations'), updateQuotation);
router.delete('/:id', authenticate, requireModuleAccess('Quotations'), deleteQuotation);
router.post('/:id/generate-pdf', authenticate, requireModuleAccess('Quotations'), generateQuotationPdf);
router.patch('/:id/status', authenticate, requireModuleAccess('Quotations'), updateQuotationStatus);
router.post('/:id/convert', authenticate, requireModuleAccess('Quotations'), convertQuotationToBooking);

export default router;
