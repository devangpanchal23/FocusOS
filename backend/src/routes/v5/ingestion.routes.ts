import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { IngestionController } from '../../controllers/v5/ingestion.controller.js';

// Mounted at /api/v5/ingestion by the route-integration step.
export const ingestionRouter = Router();
ingestionRouter.use(authMiddleware);
ingestionRouter.get('/stats', IngestionController.getStats);
