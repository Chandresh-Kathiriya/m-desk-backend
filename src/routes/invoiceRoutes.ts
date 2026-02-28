import express from 'express';
import { getInvoices, getMyInvoices, getInvoiceById, getInvoiceByOrderId, downloadInvoicePDF } from '../controllers/invoiceController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

router.route('/myinvoices').get(authenticate, getMyInvoices);
router.route('/order/:orderId').get(authenticate, getInvoiceByOrderId); // Check if order has invoice
router.route('/:id/download').get(authenticate, downloadInvoicePDF);
router.route('/:id').get(authenticate, getInvoiceById); // Get specific invoice

router.route('/').get(authenticate, authorizeRoles('admin'), getInvoices);

export default router;