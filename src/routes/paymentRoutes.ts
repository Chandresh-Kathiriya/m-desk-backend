import express from 'express';
import { registerPayment, getPayments } from '../controllers/paymentController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Payments are strictly an Admin Accounting feature
router.use(authenticate, authorizeRoles('admin'));

router.route('/')
    .post(registerPayment)
    .get(getPayments);

export default router;