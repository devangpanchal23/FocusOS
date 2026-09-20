import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { deviceRouter } from './device.routes.js';
import { uploadRouter } from './upload.routes.js';
import { analyticsRouter } from './analytics.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/devices', deviceRouter);
apiRouter.use('/uploads', uploadRouter);
apiRouter.use('/analytics', analyticsRouter);

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Focus Intelligence API',
    timestamp: new Date().toISOString(),
  });
});
