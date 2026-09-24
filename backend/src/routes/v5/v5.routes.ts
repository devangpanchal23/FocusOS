import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { syncTokenMiddleware } from '../../middleware/syncToken.middleware.js';
import { BrowserIntelligenceController } from '../../controllers/v5/browserIntelligence.controller.js';
import { DesktopAgentController } from '../../controllers/v5/desktopAgent.controller.js';
import { TimelineController } from '../../controllers/v5/timeline.controller.js';
import { TimeIntelligenceController } from '../../controllers/v5/timeIntelligence.controller.js';
import { MobileController } from '../../controllers/v5/mobile.controller.js';

export const v5Router = Router();

// --- Browser Intelligence ---
const browserRouter = Router();
browserRouter.use(authMiddleware);
browserRouter.post('/sessions', BrowserIntelligenceController.ingestSessions);
browserRouter.get('/summary', BrowserIntelligenceController.getSummary);
browserRouter.get('/domains', BrowserIntelligenceController.getDomains);
browserRouter.get('/exclusions', BrowserIntelligenceController.getExclusions);
browserRouter.post('/exclusions', BrowserIntelligenceController.createExclusion);
browserRouter.delete('/exclusions/:id', BrowserIntelligenceController.deleteExclusion);
browserRouter.get('/category-rules', BrowserIntelligenceController.getCategoryRules);
browserRouter.post('/category-rules', BrowserIntelligenceController.createCategoryRule);
v5Router.use('/browser', browserRouter);

// --- Desktop Companion ---
// /register and /status are JWT-authed; /sync is authenticated via X-Sync-Token instead.
const desktopRouter = Router();
desktopRouter.post('/register', authMiddleware, DesktopAgentController.register);
desktopRouter.get('/status', authMiddleware, DesktopAgentController.status);
desktopRouter.post('/sync', syncTokenMiddleware, DesktopAgentController.sync);
v5Router.use('/desktop', desktopRouter);

// --- Unified Timeline ---
const timelineRouter = Router();
timelineRouter.use(authMiddleware);
timelineRouter.get('/', TimelineController.getTimeline);
timelineRouter.get('/day-summary', TimelineController.getDaySummary);
v5Router.use('/timeline', timelineRouter);

// --- Personal Time Intelligence ---
const timeIntelligenceRouter = Router();
timeIntelligenceRouter.use(authMiddleware);
timeIntelligenceRouter.get('/summary', TimeIntelligenceController.getSummary);
timeIntelligenceRouter.get('/anomalies', TimeIntelligenceController.getAnomalies);
timeIntelligenceRouter.post('/recompute', TimeIntelligenceController.recompute);
v5Router.use('/time-intelligence', timeIntelligenceRouter);

// --- Mobile (architecture-only; no event-sync endpoint this pass) ---
const mobileRouter = Router();
mobileRouter.post('/link-token', authMiddleware, MobileController.createLinkToken);
mobileRouter.post('/claim', MobileController.claim);
v5Router.use('/mobile', mobileRouter);
