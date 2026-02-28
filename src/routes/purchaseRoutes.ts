import express from 'express';
import { 
    createPurchaseOrder, 
    confirmPurchaseOrder, 
    convertToBill,
    getPurchaseOrderById,
    getPurchaseOrders
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
router.route('/:id/confirm').put(confirmPurchaseOrder);

// Route to convert a confirmed PO into a Vendor Bill
router.route('/:id/bill').post(convertToBill);

export default router;