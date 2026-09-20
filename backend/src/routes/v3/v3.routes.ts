import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { AiAssistantController } from '../../controllers/aiAssistant.controller.js';
import { AiCoachController } from '../../controllers/aiCoach.controller.js';
import { PredictiveController } from '../../controllers/predictive.controller.js';
import { GoalController } from '../../controllers/goal.controller.js';
import { DailyPlannerController } from '../../controllers/dailyPlanner.controller.js';
import { ExtensionController } from '../../controllers/extension.controller.js';
import { CollaborationController } from '../../controllers/collaboration.controller.js';
import { DeveloperController } from '../../controllers/developer.controller.js';
import { PrivacyController } from '../../controllers/privacy.controller.js';

export const v3Router = Router();

// Apply auth middleware to all v3 protected routes
v3Router.use(authMiddleware);

// --- 1. AI Assistant ---
v3Router.get('/assistant/history', AiAssistantController.getHistory);
v3Router.post('/assistant/chat', AiAssistantController.sendMessage);
v3Router.delete('/assistant/history', AiAssistantController.clearHistory);

// --- 2. AI Coach ---
v3Router.get('/coach/profile', AiCoachController.getProfile);
v3Router.put('/coach/profile', AiCoachController.updateProfile);
v3Router.get('/coach/assessment', AiCoachController.getAssessment);

// --- 3. Predictive & Risk Analytics ---
v3Router.get('/predictions', PredictiveController.getPredictions);
v3Router.get('/predictions/risks', PredictiveController.getRiskLogs);
v3Router.post('/predictions/risks/:riskId/dismiss', PredictiveController.dismissRisk);

// --- 4. SMART Goals ---
v3Router.get('/goals', GoalController.getGoals);
v3Router.post('/goals', GoalController.createGoal);
v3Router.put('/goals/:goalId', GoalController.updateGoal);
v3Router.delete('/goals/:goalId', GoalController.deleteGoal);
v3Router.post('/goals/plan', GoalController.generateAiPlan);

// --- 5. AI Daily Planner ---
v3Router.get('/planner', DailyPlannerController.getPlan);
v3Router.post('/planner/generate', DailyPlannerController.generateAiPlan);
v3Router.post('/planner/blocks', DailyPlannerController.addBlock);
v3Router.patch('/planner/blocks/:blockId/toggle', DailyPlannerController.toggleBlock);
v3Router.delete('/planner/blocks/:blockId', DailyPlannerController.deleteBlock);

// --- 6. Browser Extension Companion Sync ---
v3Router.get('/extension/config', ExtensionController.getConfig);
v3Router.post('/extension/heartbeat', ExtensionController.syncHeartbeat);
v3Router.get('/extension/evaluate', ExtensionController.evaluateDomain);

// --- 7. Accountability Circles & Social ---
v3Router.get('/circles', CollaborationController.getCircles);
v3Router.post('/circles', CollaborationController.createCircle);
v3Router.post('/circles/join', CollaborationController.joinCircle);
v3Router.post('/circles/:circleId/leave', CollaborationController.leaveCircle);
v3Router.get('/circles/:circleId/leaderboard', CollaborationController.getLeaderboard);

// --- 8. Developer Platform (API Keys & Webhooks) ---
v3Router.get('/developer/keys', DeveloperController.getApiKeys);
v3Router.post('/developer/keys', DeveloperController.createApiKey);
v3Router.delete('/developer/keys/:keyId', DeveloperController.revokeApiKey);
v3Router.get('/developer/webhooks', DeveloperController.getWebhooks);
v3Router.post('/developer/webhooks', DeveloperController.createWebhook);
v3Router.delete('/developer/webhooks/:webhookId', DeveloperController.deleteWebhook);
v3Router.post('/developer/webhooks/:webhookId/test', DeveloperController.testWebhook);

// --- 9. Privacy Center & Data Sovereignty ---
v3Router.get('/privacy/summary', PrivacyController.getSummary);
v3Router.post('/privacy/purge', PrivacyController.purgeData);
v3Router.get('/privacy/audit-logs', PrivacyController.getAuditLogs);
