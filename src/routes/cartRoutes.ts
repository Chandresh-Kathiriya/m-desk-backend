import express from 'express';
import { syncCartItem, getUserCart, removeCartItem, updateCartItemQty, clearCart } from '../controllers/cartController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Both routes must be protected
router.route('/')
  .post(authenticate, syncCartItem)
  .get(authenticate, getUserCart)
  .delete(authenticate, clearCart);

router.route('/:sku')
  .delete(authenticate, removeCartItem)
  .put(authenticate, updateCartItemQty);

export default router;