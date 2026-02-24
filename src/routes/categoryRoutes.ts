// src/routes/categoryRoutes.ts
import { Router } from 'express';
import Category from '../models/Category.js'; 
import { createCrudController } from '../controllers/crudFactory.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();
const categoryController = createCrudController(Category);

router.get('/', categoryController.getAllRecords);
router.get('/:id', categoryController.getRecordById);
router.use(authenticate, authorizeRoles('admin'));
router.post('/', categoryController.createRecord);
router.put('/:id', categoryController.updateRecord);
router.delete('/:id', categoryController.deleteRecord);

export default router;

// --- DO THE EXACT SAME FOR src/routes/categoryRoutes.ts ---
// Just import Category from '../models/Category.js' instead!