import { Router } from 'express';
import Color from '../models/Color.js'; // <-- Notice the .js here too!
import { createCrudController } from '../controllers/crudFactory.js'; // <-- And here!
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();
const colorController = createCrudController(Color);

router.get('/', colorController.getAllRecords);
router.get('/:id', colorController.getRecordById);

router.use(authenticate, authorizeRoles('admin'));
router.post('/', colorController.createRecord);
router.put('/:id', colorController.updateRecord);
router.delete('/:id', colorController.deleteRecord);

export default router;