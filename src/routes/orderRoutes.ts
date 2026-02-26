import express from 'express';
import { 
  addOrderItems, 
  getMyOrders, 
  getOrderById, 
  getOrders, 
  updateOrderToDelivered,
  verifyPayment 
} from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js'; 

const router = express.Router();

router.route('/')
  .post(authenticate, addOrderItems)
  .get(authenticate, getOrders);

router.route('/myorders').get(authenticate, getMyOrders);

router.route('/verify-payment').post(authenticate, verifyPayment);

router.route('/:id').get(authenticate, getOrderById);
router.route('/:id/deliver').put(authenticate, updateOrderToDelivered);

export default router;