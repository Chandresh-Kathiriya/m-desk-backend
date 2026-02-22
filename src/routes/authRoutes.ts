import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (requires a valid JWT)
router.get('/me', authenticate, getCurrentUser);

export default router;