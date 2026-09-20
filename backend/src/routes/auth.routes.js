import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
export const authRouter = Router();
authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.get('/me', authMiddleware, AuthController.me);
authRouter.patch('/profile', authMiddleware, AuthController.updateProfile);
