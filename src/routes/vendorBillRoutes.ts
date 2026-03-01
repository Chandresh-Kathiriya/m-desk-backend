import express from 'express';
import { getVendorBills, getVendorBillById, downloadVendorBillPDF } from '../controllers/vendorBillController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorizeRoles('admin'));
router.route('/').get(getVendorBills);
router.route('/:id').get(getVendorBillById);
router.route('/:id/download').get(downloadVendorBillPDF);

export default router;