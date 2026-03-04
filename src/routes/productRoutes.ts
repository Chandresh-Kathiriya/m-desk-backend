import { Router } from 'express';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminProducts,
  getPublishedProducts,
  getProductById,
  getAdminProductById,
  getPublicProducts,
  getPublicProductById,
  createProductReview,
  reportReview,
  voteReview,
  updateProductReview,
  deleteProductReview, // <-- NEW: Import the delete function
  getSimilarProducts
} from '../controllers/productController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// ==========================================
// PUBLIC & ADMIN GET ROUTES
// ==========================================
// 1. Specific/Admin Routes MUST go first!
router.get('/admin/all', getAdminProducts);
router.get('/admin/:id', getAdminProductById);

router.get('/public', getPublicProducts);
router.get('/public/:id', getPublicProductById);

// 2. General Routes go second
router.get('/', getPublishedProducts);

// 3. Dynamic ID Routes MUST go last!
router.get('/:id', getProductById);
router.get('/:id/similar', getSimilarProducts);
router.route('/:id/reviews').post(authenticate, createProductReview);

// <-- NEW: Chained the .delete() method onto your existing route! -->
router.route('/:id/reviews/:reviewId')
  .put(authenticate, updateProductReview)
  .delete(authenticate, deleteProductReview); 

router.route('/:id/reviews/:reviewId/vote').put(authenticate, voteReview);
router.route('/:id/reviews/:reviewId/report').put(authenticate, reportReview);


// ==========================================
// ADMIN ONLY MUTATION ROUTES
// ==========================================
router.use(authenticate, authorizeRoles('admin'));

router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;