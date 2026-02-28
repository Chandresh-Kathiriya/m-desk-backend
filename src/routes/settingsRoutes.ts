import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Both routes are protected for Admins only
router.route('/')
    .get(authenticate, authorizeRoles('admin'), getSettings)
    .put(authenticate, authorizeRoles('admin'), updateSettings);

export default router;