import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  getSystemSettings,
  updateSystemSettings,
  getHomepageContent,
  updateHomepageContent,
  createHeroMedia,
  updateHeroMedia,
  deleteHeroMedia,
  updateDestinationCoordinates,
  createDestination,
  deleteDestination,
  getPackagesPageContent,
  updatePackagesPageContent,
  getFooterContent,
  updateFooterContent
} from '../controllers/settingsController';
import { authenticate, requireModuleAccess, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

// Public Read Routes
router.get('/homepage', getHomepageContent);
router.get('/packages-page', getPackagesPageContent);
router.get('/footer', getFooterContent);

// Authenticated Profile Routes
router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, updateProfile);
router.patch('/password', authenticate, changePassword);

// Admin System & Homepage Management Routes
const adminRoles = authorizeRole(['HR_MANAGER', 'ADMIN', 'SUPER_ADMIN']);
router.get('/system', authenticate, requireModuleAccess('System Settings'), getSystemSettings);
router.patch('/system', authenticate, adminRoles, updateSystemSettings);
router.patch('/homepage', authenticate, adminRoles, updateHomepageContent);
router.patch('/packages-page', authenticate, adminRoles, updatePackagesPageContent);
router.patch('/footer', authenticate, adminRoles, updateFooterContent);
router.post('/homepage/hero-media', authenticate, adminRoles, createHeroMedia);
router.patch('/homepage/hero-media/:id', authenticate, adminRoles, updateHeroMedia);
router.delete('/homepage/hero-media/:id', authenticate, adminRoles, deleteHeroMedia);

// Destination Management Routes
router.post('/destinations', authenticate, adminRoles, createDestination);
router.patch('/destinations/:id', authenticate, adminRoles, updateDestinationCoordinates);
router.delete('/destinations/:id', authenticate, adminRoles, deleteDestination);

export default router;
