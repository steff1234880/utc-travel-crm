import { Router } from 'express';
import { getBlogs, getBlogBySlug, createBlog, updateBlog, deleteBlog, getCategories, createCategory, getAdminBlogs } from '../controllers/blogController';
import { authenticateJWT, requireModuleAccess } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/', getBlogs);
router.get('/categories/all', getCategories);
router.get('/:slug', getBlogBySlug);

// Admin routes (Protected)
router.get('/admin/all', authenticateJWT, requireModuleAccess('Website Management'), getAdminBlogs);
router.post('/categories', authenticateJWT, requireModuleAccess('Website Management'), createCategory);
router.post('/', authenticateJWT, requireModuleAccess('Website Management'), createBlog);
router.put('/:id', authenticateJWT, requireModuleAccess('Website Management'), updateBlog);
router.delete('/:id', authenticateJWT, requireModuleAccess('Website Management'), deleteBlog);

export default router;
