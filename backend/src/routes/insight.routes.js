import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { InsightController } from '../controllers/insight.controller.js';
export const insightRouter = Router();
insightRouter.use(requireAuth);
insightRouter.get('/', InsightController.getInsights);
