import express from 'express';
import { getUsers } from '../controllers/userController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Only logged-in Admins can access user routes
router.use(authenticate, authorizeRoles('admin'));

router.route('/')
    .get(getUsers);

export default router;