// src/routes/typeRoutes.ts
import { Router } from 'express';
import Type from '../models/Type.js'; 
import { createCrudController } from '../controllers/crudFactory.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();
const typeController = createCrudController(Type);

router.get('/', typeController.getAllRecords);
router.get('/:id', typeController.getRecordById);
router.use(authenticate, authorizeRoles('admin'));
router.post('/', typeController.createRecord);
router.put('/:id', typeController.updateRecord);
router.delete('/:id', typeController.deleteRecord);

export default router;

// --- DO THE EXACT SAME FOR src/routes/categoryRoutes.ts ---
// Just import Category from '../models/Category.js' instead!