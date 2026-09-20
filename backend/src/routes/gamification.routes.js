import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { GamificationController } from '../controllers/gamification.controller.js';
export const gamificationRouter = Router();
gamificationRouter.use(requireAuth);
gamificationRouter.get('/', GamificationController.getGamification);
gamificationRouter.post('/check', GamificationController.checkAchievements);
