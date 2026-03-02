import express from 'express';
import { 
  addOrderItems, 
  getMyOrders, 
  getOrderById, 
  getOrders, 
  updateOrderToDelivered,
  verifyPayment,
  createStripeIntent,
  markOrderAsPaidAdmin
} from '../controllers/orderController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js'; 

const router = express.Router();

// --- NEW STRIPE INTENT ROUTE ---
router.route('/stripe-intent').post(authenticate, createStripeIntent);

router.route('/')
  .post(authenticate, addOrderItems)
  .get(authenticate, getOrders);

  router.route('/:id/pay-admin').put(authenticate, authorizeRoles('admin'), markOrderAsPaidAdmin);

router.route('/myorders').get(authenticate, getMyOrders);
router.route('/verify-payment').post(authenticate, verifyPayment);
router.route('/:id').get(authenticate, getOrderById);
router.route('/:id/deliver').put(authenticate, updateOrderToDelivered);

export default router;