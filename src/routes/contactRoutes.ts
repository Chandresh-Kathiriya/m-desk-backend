import express from 'express';
import { getContacts } from '../controllers/contactController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Only Admins should be able to fetch the master list of contacts
router.route('/').get(authenticate, authorizeRoles('admin'), getContacts);

export default router;