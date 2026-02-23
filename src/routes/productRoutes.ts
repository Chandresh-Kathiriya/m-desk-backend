import { Router } from 'express';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminProducts,
  getPublishedProducts,
  getProductById,
} from '../controllers/productController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// ==========================================
// PUBLIC ROUTES (Customers & Visitors)
// ==========================================

// Get all published products (supports search & filter queries)
router.get('/', getPublishedProducts);

// Get a specific product by ID
router.get('/:id', getProductById);


// ==========================================
// ADMIN ONLY ROUTES
// ==========================================

// Apply authentication and admin role check to ALL routes below this line
router.use(authenticate, authorizeRoles('admin'));

// Get all products (including unpublished) for the admin dashboard
router.get('/admin/all', getAdminProducts);

// Create a new product
router.post('/', createProduct);

// Update an existing product
router.put('/:id', updateProduct);

// Delete a product
router.delete('/:id', deleteProduct);

export default router;