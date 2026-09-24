import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { AutomationController } from '../controllers/automation.controller.js';

export const automationRouter = Router();

automationRouter.use(requireAuth);

automationRouter.get('/rules', AutomationController.getRules);
automationRouter.post('/rules', AutomationController.createRule);
automationRouter.put('/rules/:id', AutomationController.updateRule);
automationRouter.delete('/rules/:id', AutomationController.deleteRule);
automationRouter.get('/logs', AutomationController.getLogs);
automationRouter.post('/evaluate', AutomationController.evaluateRules);
automationRouter.post('/rules/:id/test', AutomationController.testRule);
automationRouter.post('/rules/test-draft', AutomationController.testDraftRule);
