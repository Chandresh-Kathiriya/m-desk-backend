import { Router } from 'express';
import { getInventoryList, adjustSkuStock } from '../controllers/inventoryController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Only Admins can view and adjust inventory
router.use(authenticate, authorizeRoles('admin'));

router.get('/', getInventoryList);
router.put('/adjust', adjustSkuStock);

export default router;