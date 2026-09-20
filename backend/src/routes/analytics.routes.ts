import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const analyticsRouter = Router();

analyticsRouter.use(authMiddleware);

analyticsRouter.get('/overview', AnalyticsController.getOverview);
analyticsRouter.get('/trends', AnalyticsController.getTrends);
analyticsRouter.get('/categories', AnalyticsController.getCategories);
analyticsRouter.get('/applications', AnalyticsController.getApplications);
