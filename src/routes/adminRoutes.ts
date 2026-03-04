import express from 'express';
import { getAdminProfile, updateAdminProfile } from '../controllers/adminController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Route: /api/admin/profile
// Strictly locked down to authenticated Admins only
router.route('/profile')
    .get(authenticate, authorizeRoles('admin'), getAdminProfile)
    .put(authenticate, authorizeRoles('admin'), updateAdminProfile);

export default router;