import express from 'express';
import { 
  createPaymentTerm, 
  getPaymentTerms, 
  deletePaymentTerm 
} from '../controllers/paymentTermController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(authenticate, getPaymentTerms)
  .post(authenticate, authorizeRoles('admin'), createPaymentTerm);

router.route('/:id')
  .delete(authenticate, authorizeRoles('admin'), deletePaymentTerm);

export default router;