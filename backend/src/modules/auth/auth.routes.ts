import { Router } from 'express';
import { login, getMe } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me  (requires valid JWT)
router.get('/me', authenticate, getMe);

export default router;
