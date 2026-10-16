import { Router } from 'express';
import {
  getPackages,
  getPackageBySlug,
  createPackage,
  updatePackage,
  deletePackage,
  getDestinations,
  uploadPackageFile,
  deletePackageHero,
  deletePackageVideo,
  getTopHighlights,
  createTopHighlight,
  updateTopHighlight,
  deleteTopHighlight,
  reorderTopHighlights
} from '../controllers/packageController';
import { getPackageAvailability, togglePackageAvailability } from '../controllers/packageAvailabilityController';
import { authenticate, authorizeRole } from '../middleware/authMiddleware';
import { packageMediaUpload } from '../middleware/packageMediaUpload';

const router = Router();

// Public & CRM Read Routes
router.get('/destinations', getDestinations);
router.get('/', getPackages);
router.get('/:slug', getPackageBySlug);
router.get('/:id/availability', getPackageAvailability);
router.get('/:id/top-highlights', getTopHighlights);

// Admin Write Routes
const adminRoles = authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']);

router.post('/', authenticate, adminRoles, createPackage);
router.patch('/:id', authenticate, adminRoles, updatePackage);
router.delete('/:id', authenticate, adminRoles, deletePackage);
router.post('/:id/availability/toggle', authenticate, adminRoles, togglePackageAvailability);

// Package Media Management Routes
router.post('/upload-media', authenticate, adminRoles, packageMediaUpload.single('file'), uploadPackageFile);
router.delete('/:id/hero', authenticate, adminRoles, deletePackageHero);
router.delete('/:id/video', authenticate, adminRoles, deletePackageVideo);

// Top Highlights Management Routes
router.post('/:id/top-highlights', authenticate, adminRoles, createTopHighlight);
router.patch('/:id/top-highlights/reorder', authenticate, adminRoles, reorderTopHighlights);
router.patch('/:id/top-highlights/:highlightId', authenticate, adminRoles, updateTopHighlight);
router.delete('/:id/top-highlights/:highlightId', authenticate, adminRoles, deleteTopHighlight);

export default router;
