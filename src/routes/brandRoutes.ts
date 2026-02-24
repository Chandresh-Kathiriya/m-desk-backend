import { Router } from 'express';
import Brand from '../models/Brand';
import { createCrudController } from '../controllers/crudFactory';
import { authenticate, authorizeRoles } from '../middleware/auth';

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