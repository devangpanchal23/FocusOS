import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { TimeIntelligenceController } from '../../controllers/v5/timeIntelligence.controller.js';

// Mounted at /api/v5/time-intelligence by the route-integration step (alongside
// the existing timeIntelligenceRouter in v5.routes.ts).
export const timeIntelligenceExtraRouter = Router();
timeIntelligenceExtraRouter.use(authMiddleware);

timeIntelligenceExtraRouter.get('/distraction-windows', TimeIntelligenceController.getDistractionWindows);
timeIntelligenceExtraRouter.get('/context-switching', TimeIntelligenceController.getContextSwitching);
timeIntelligenceExtraRouter.get('/long-sessions', TimeIntelligenceController.getLongSessions);
timeIntelligenceExtraRouter.get('/unusual-sessions', TimeIntelligenceController.getUnusualSessions);
timeIntelligenceExtraRouter.get('/weekday-weekend', TimeIntelligenceController.getWeekdayWeekendComparison);
timeIntelligenceExtraRouter.get('/period-breakdown', TimeIntelligenceController.getPeriodBreakdown);
timeIntelligenceExtraRouter.get('/pattern-cards', TimeIntelligenceController.getPatternCards);
timeIntelligenceExtraRouter.get('/preferences', TimeIntelligenceController.getPreferences);
timeIntelligenceExtraRouter.put('/preferences', TimeIntelligenceController.updatePreferences);
