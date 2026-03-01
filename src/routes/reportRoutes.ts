import express from 'express';
import { 
    getSalesReportByProducts, 
    getPurchaseReportByProducts, 
    getSalesReportByCustomers, 
    getPurchaseReportByVendors,
    exportReportGenerator
} from '../controllers/reportController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// All reports are strictly for Admin
router.use(authenticate, authorizeRoles('admin'));

router.get('/sales/products', getSalesReportByProducts);
router.get('/purchases/products', getPurchaseReportByProducts);
router.get('/sales/customers', getSalesReportByCustomers);
router.get('/purchases/vendors', getPurchaseReportByVendors);
router.post('/export', exportReportGenerator);

export default router;