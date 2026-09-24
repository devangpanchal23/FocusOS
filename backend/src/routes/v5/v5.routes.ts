import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { syncTokenMiddleware } from '../../middleware/syncToken.middleware.js';
import { BrowserIntelligenceController } from '../../controllers/v5/browserIntelligence.controller.js';
import { DesktopAgentController } from '../../controllers/v5/desktopAgent.controller.js';
import { TimelineController } from '../../controllers/v5/timeline.controller.js';
import { TimeIntelligenceController } from '../../controllers/v5/timeIntelligence.controller.js';
import { MobileController } from '../../controllers/v5/mobile.controller.js';

// V5.1 Completion Pass additions
import { browserExtraRouter } from './browserExtra.routes.js';
import { desktopSettingsRouter } from './desktopSettings.routes.js';
import { ingestionRouter } from './ingestion.routes.js';
import { timeIntelligenceExtraRouter } from './timeIntelligenceExtra.routes.js';
import { mobileExtraRouter } from './mobileExtra.routes.js';
import { shortFormRouter } from './shortForm.routes.js';
import { dataSourcesRouter, syncCenterRouter, dataManagementRouter } from './uiSupport.routes.js';

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
// §32: tab-switching metrics + multi-instance breakdown
v5Router.use('/browser', browserExtraRouter);

// --- Desktop Companion ---
// /register and /status are JWT-authed; /sync is authenticated via X-Sync-Token instead.
const desktopRouter = Router();
desktopRouter.post('/register', authMiddleware, DesktopAgentController.register);
desktopRouter.get('/status', authMiddleware, DesktopAgentController.status);
desktopRouter.post('/sync', syncTokenMiddleware, DesktopAgentController.sync);
v5Router.use('/desktop', desktopRouter);
// §33: privacy settings (GET accepts JWT or X-Sync-Token, PUT is JWT-only)
v5Router.use('/desktop', desktopSettingsRouter);

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
// §37: distraction windows, context switching, long/unusual sessions, periods, pattern cards, preferences
v5Router.use('/time-intelligence', timeIntelligenceExtraRouter);

// --- Mobile ---
const mobileRouter = Router();
mobileRouter.post('/link-token', authMiddleware, MobileController.createLinkToken);
mobileRouter.post('/claim', MobileController.claim);
v5Router.use('/mobile', mobileRouter);
// §34: real event sync (sync-token) + device permission CRUD
v5Router.use('/mobile', mobileExtraRouter);

// --- Ingestion (§31) ---
v5Router.use('/ingestion', ingestionRouter);

// --- Advanced Short-Form Intelligence (§35, new) ---
v5Router.use('/short-form', shortFormRouter);

// --- UI-completion support endpoints (§10) ---
v5Router.use('/data-sources', dataSourcesRouter);
v5Router.use('/sync-center', syncCenterRouter);
v5Router.use('/data-management', dataManagementRouter);
