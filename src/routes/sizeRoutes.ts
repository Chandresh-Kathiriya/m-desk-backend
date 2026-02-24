import { Router } from 'express';
import Size from '../models/Size.js'; // MUST have .js
import { createCrudController } from '../controllers/crudFactory.js'; // MUST have .js
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();
const sizeController = createCrudController(Size);

router.get('/', sizeController.getAllRecords);
router.get('/:id', sizeController.getRecordById);

router.use(authenticate, authorizeRoles('admin'));
router.post('/', sizeController.createRecord);
router.put('/:id', sizeController.updateRecord);
router.delete('/:id', sizeController.deleteRecord);

export default router;