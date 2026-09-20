import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { BlockingController } from '../controllers/blocking.controller.js';

export const blockingRouter = Router();

blockingRouter.use(requireAuth);

blockingRouter.get('/rules', BlockingController.getRules);
blockingRouter.post('/rules', BlockingController.createRule);
blockingRouter.put('/rules/:id', BlockingController.updateRule);
blockingRouter.delete('/rules/:id', BlockingController.deleteRule);
blockingRouter.post('/rules/:id/override', BlockingController.createOverride);
blockingRouter.get('/overrides', BlockingController.getOverrides);
