import { Router } from 'express';
import Brand from '../models/Brand.js';
import { createCrudController } from '../controllers/crudFactory.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// Generate all CRUD functions specifically for the Brand model!
const brandController = createCrudController(Brand);

// Public Routes (Customers need to see brands in filters)
router.get('/', brandController.getAllRecords);
router.get('/:id', brandController.getRecordById);

// Admin Only Routes
router.use(authenticate, authorizeRoles('admin'));
router.post('/', brandController.createRecord);
router.put('/:id', brandController.updateRecord);
router.delete('/:id', brandController.deleteRecord);

export default router;