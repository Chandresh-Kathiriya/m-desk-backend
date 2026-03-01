import express from 'express';
import { 
    createPurchaseOrder, 
    downloadPurchaseOrderPDF, 
    getPurchaseOrderById,
    getPurchaseOrders,
    receiveAndBillPurchaseOrder
} from '../controllers/purchaseController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// All purchase routes are strictly for Admins
router.use(authenticate, authorizeRoles('admin'));
router.route('/').post(createPurchaseOrder).get(getPurchaseOrders);
// Route to create a new Draft PO
router.route('/').post(createPurchaseOrder);

// Route to confirm a PO (Updates Stock)
router.route('/:id').get(getPurchaseOrderById);
router.route('/:id/receive').post(receiveAndBillPurchaseOrder);
router.route('/:id/download').get(downloadPurchaseOrderPDF);

export default router;