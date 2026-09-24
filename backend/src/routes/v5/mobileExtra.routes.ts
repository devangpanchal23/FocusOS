import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { syncTokenMiddleware } from '../../middleware/syncToken.middleware.js';
import { MobileController } from '../../controllers/v5/mobile.controller.js';

// Relative to eventual mount at /api/v5/mobile (alongside mobile.routes.ts's
// /link-token and /claim, mounted by another agent). Final URLs:
//   POST /api/v5/mobile/sync
//   GET  /api/v5/mobile/permissions
//   PUT  /api/v5/mobile/permissions
export const mobileExtraRouter = Router();

mobileExtraRouter.post('/sync', syncTokenMiddleware, MobileController.sync);
mobileExtraRouter.get('/permissions', authMiddleware, MobileController.getPermissions);
mobileExtraRouter.put('/permissions', authMiddleware, MobileController.upsertPermission);
