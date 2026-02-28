import express from 'express';
import { 
    getContacts, 
    createContact, 
    updateContact, 
    deleteContact 
} from '../controllers/contactController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// All contact routes are protected for Admins
router.use(authenticate, authorizeRoles('admin'));

router.route('/')
    .get(getContacts)
    .post(createContact);

router.route('/:id')
    .put(updateContact)
    .delete(deleteContact);

export default router;