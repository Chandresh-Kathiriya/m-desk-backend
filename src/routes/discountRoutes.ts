import express from 'express';
import { 
    createDiscountOffer, 
    createCoupon, 
    validateCoupon, 
    getDiscountOffers, 
    getCoupons
} from '../controllers/discountController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Parent Offers
router.route('/offers')
    .post(authenticate, authorizeRoles('admin'), createDiscountOffer)
    .get(authenticate, authorizeRoles('admin'), getDiscountOffers);

// Child Coupons
router.route('/coupons')
    .post(authenticate, authorizeRoles('admin'), createCoupon)
    .get(authenticate, authorizeRoles('admin'), getCoupons);

// Checkout Validation (Portal Users)
router.post('/validate', authenticate, validateCoupon);

export default router;