import express from 'express';
import { createCoupon, getCoupons, validateCoupon } from '../controllers/couponController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Admin route to create coupons
router.route('/')
  .post(authenticate, authorizeRoles('admin'), createCoupon)
  .get(authenticate, authorizeRoles('admin'), getCoupons);

// User route to validate a coupon during checkout
router.route('/validate').post(authenticate, validateCoupon);

export default router;