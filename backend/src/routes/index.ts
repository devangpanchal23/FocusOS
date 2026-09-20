import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { deviceRouter } from './device.routes.js';
import { uploadRouter } from './upload.routes.js';
import { analyticsRouter } from './analytics.routes.js';
import { focusRouter } from './focus.routes.js';
import { blockingRouter } from './blocking.routes.js';
import { automationRouter } from './automation.routes.js';
import { routineRouter } from './routine.routes.js';
import { gamificationRouter } from './gamification.routes.js';
import { notificationRouter } from './notification.routes.js';
import { settingsRouter } from './settings.routes.js';
import { exportRouter } from './export.routes.js';
import { insightRouter } from './insight.routes.js';

export const apiRouter = Router();

// Core V1 Endpoints
apiRouter.use('/auth', authRouter);
apiRouter.use('/devices', deviceRouter);
apiRouter.use('/uploads', uploadRouter);
apiRouter.use('/analytics', analyticsRouter);

// V2 Advanced SaaS Endpoints
apiRouter.use('/focus', focusRouter);
apiRouter.use('/blocking', blockingRouter);
apiRouter.use('/automation', automationRouter);
apiRouter.use('/routines', routineRouter);
apiRouter.use('/gamification', gamificationRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/export', exportRouter);
apiRouter.use('/insights', insightRouter);

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Focus Intelligence API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});
