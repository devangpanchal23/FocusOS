import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { AutomationController } from '../controllers/automation.controller.js';

/**
 * Version 5.1 (§38) additions to the automation surface: rule templates,
 * per-rule delivery logs, and combined trigger/delivery history. Kept in a
 * separate router (rather than editing automation.routes.ts) to avoid
 * merge conflicts with the parallel agents' route files — the integrator
 * mounts this alongside automationRouter at /api/automation.
 *
 * Final URLs (once mounted at /api/automation):
 *   GET  /api/automation/templates
 *   POST /api/automation/templates/:key/instantiate
 *   GET  /api/automation/rules/:id/delivery-log
 *   GET  /api/automation/history
 */
export const automationExtraRouter = Router();

automationExtraRouter.use(requireAuth);

automationExtraRouter.get('/templates', AutomationController.getTemplates);
automationExtraRouter.post('/templates/:key/instantiate', AutomationController.instantiateTemplate);
automationExtraRouter.get('/rules/:id/delivery-log', AutomationController.getRuleDeliveryLog);
automationExtraRouter.get('/history', AutomationController.getHistory);
