import express from 'express';
// (Make sure to import getUserById if you are using it at the bottom!)
import { getUserProfile, getUsers, updateUserProfile, getUserById } from '../controllers/userController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// 1. Specific string routes FIRST (Available to ANY authenticated user)
router.route('/profile')
    .get(authenticate, getUserProfile)
    .put(authenticate, updateUserProfile);

// 2. Admin ONLY routes
router.route('/')
    .get(authenticate, authorizeRoles('admin'), getUsers);

// 3. Dynamic /:id routes LAST (Admin ONLY)
router.route('/:id')
    .get(authenticate, authorizeRoles('admin'), getUserById);

export default router;