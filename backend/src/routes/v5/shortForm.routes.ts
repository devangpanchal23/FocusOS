import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { ShortFormIntelligenceController } from '../../controllers/v5/shortFormIntelligence.controller.js';

// Mounted at /api/v5/short-form by a later integration pass. Final URLs:
//   POST /api/v5/short-form/sync
//   GET  /api/v5/short-form/hotspots
//   GET  /api/v5/short-form/heatmap
//   GET  /api/v5/short-form/platforms
//   GET  /api/v5/short-form/weekly
//   GET  /api/v5/short-form/monthly
//   GET  /api/v5/short-form/loops
export const shortFormRouter = Router();
shortFormRouter.use(authMiddleware);

shortFormRouter.post('/sync', ShortFormIntelligenceController.sync);
shortFormRouter.get('/hotspots', ShortFormIntelligenceController.getHotspots);
shortFormRouter.get('/heatmap', ShortFormIntelligenceController.getHeatmap);
shortFormRouter.get('/platforms', ShortFormIntelligenceController.getPlatformComparison);
shortFormRouter.get('/weekly', ShortFormIntelligenceController.getWeeklyPatterns);
shortFormRouter.get('/monthly', ShortFormIntelligenceController.getMonthlyTrends);
shortFormRouter.get('/loops', ShortFormIntelligenceController.detectRepeatedLoops);
