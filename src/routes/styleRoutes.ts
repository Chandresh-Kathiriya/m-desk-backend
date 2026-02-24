import { Router } from 'express';
import Style from '../models/Style.js'; // MUST have .js
import { createCrudController } from '../controllers/crudFactory.js'; // MUST have .js
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();
const styleController = createCrudController(Style);

router.get('/', styleController.getAllRecords);
router.get('/:id', styleController.getRecordById);

router.use(authenticate, authorizeRoles('admin'));
router.post('/', styleController.createRecord);
router.put('/:id', styleController.updateRecord);
router.delete('/:id', styleController.deleteRecord);

export default router;