import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { BrowserIntelligenceController } from '../../controllers/v5/browserIntelligence.controller.js';

// Additional §32 browser-completion endpoints, kept in their own router so
// this slice doesn't need to touch v5.routes.ts (mounted elsewhere at
// /api/v5/browser alongside browserRouter). Final URLs:
//   GET /api/v5/browser/tab-switching
//   GET /api/v5/browser/instances
export const browserExtraRouter = Router();

browserExtraRouter.use(authMiddleware);
browserExtraRouter.get('/tab-switching', BrowserIntelligenceController.getTabSwitching);
browserExtraRouter.get('/instances', BrowserIntelligenceController.getBrowserInstances);
