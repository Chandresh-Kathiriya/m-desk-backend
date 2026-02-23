import { Router } from 'express';
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from '../controllers/categoryController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Public route to fetch categories (useful for the customer storefront and filtering)
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin-only routes for modifications
router.use(authenticate, authorizeRoles('admin'));
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;