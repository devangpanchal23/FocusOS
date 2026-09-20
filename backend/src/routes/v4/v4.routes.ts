import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { V4Controller } from '../../controllers/v4/v4.controller.js';

export const v4Router = Router();

// Apply authentication to all V4 endpoints
v4Router.use(authMiddleware);

// --- 1. Autonomous AI Agent Orchestrator ---
v4Router.post('/orchestrator/query', V4Controller.orchestrate);
v4Router.get('/orchestrator/logs', V4Controller.getAgentLogs);

// --- 2. Human-In-The-Loop Approval Pipeline ---
v4Router.get('/approvals/pending', V4Controller.getPendingApprovals);
v4Router.get('/approvals/history', V4Controller.getApprovalHistory);
v4Router.post('/approvals/:id/review', V4Controller.reviewApproval);
v4Router.post('/approvals', V4Controller.createApproval);

// --- 3. AI Workflows & Visual Builder ---
v4Router.get('/workflows', V4Controller.getWorkflows);
v4Router.post('/workflows', V4Controller.createWorkflow);
v4Router.put('/workflows/:id', V4Controller.updateWorkflow);
v4Router.delete('/workflows/:id', V4Controller.deleteWorkflow);
v4Router.post('/workflows/:id/execute', V4Controller.executeWorkflow);

// --- 4. Personal Context Engine & Knowledge Vault ---
v4Router.get('/context', V4Controller.getContext);
v4Router.post('/context', V4Controller.upsertContext);
v4Router.delete('/context/:key', V4Controller.deleteContext);
v4Router.get('/knowledge', V4Controller.getKnowledgeItems);
v4Router.post('/knowledge', V4Controller.createKnowledgeItem);
v4Router.put('/knowledge/:id', V4Controller.updateKnowledgeItem);
v4Router.delete('/knowledge/:id', V4Controller.deleteKnowledgeItem);

// --- 5. Universal Productivity Search ---
v4Router.get('/search', V4Controller.universalSearch);

// --- 6. Behavioral Intelligence & Scenario Simulation ---
v4Router.get('/behavioral/correlations', V4Controller.getCorrelations);
v4Router.post('/simulations/run', V4Controller.runSimulation);
v4Router.post('/simulations/save', V4Controller.saveSimulation);
v4Router.get('/simulations/saved', V4Controller.getSavedSimulations);
v4Router.get('/adaptive-model', V4Controller.getAdaptiveModel);
v4Router.put('/adaptive-model', V4Controller.updateAdaptiveModel);
v4Router.post('/adaptive-model/reset', V4Controller.resetAdaptiveModel);

// --- 7. AI Goal Coaching & Reflections ---
v4Router.get('/coaching/status', V4Controller.getCoachingStatus);
v4Router.post('/coaching/goals/:goalId/revise', V4Controller.proposeRevisedPlan);
v4Router.get('/reflections', V4Controller.getReflections);
v4Router.post('/reflections', V4Controller.submitReflection);

// --- 8. Device & Platform Orchestration ---
v4Router.get('/devices', V4Controller.getDevices);
v4Router.post('/devices/:id/sync', V4Controller.triggerDeviceSync);
v4Router.get('/integrations', V4Controller.getIntegrations);
v4Router.post('/integrations/:provider/toggle', V4Controller.toggleIntegration);
v4Router.post('/integrations/:provider/sync', V4Controller.syncIntegration);
v4Router.get('/marketplace', V4Controller.getMarketplaceCatalog);
v4Router.post('/marketplace/:slug/install', V4Controller.installMarketplaceApp);
v4Router.post('/marketplace/:slug/uninstall', V4Controller.uninstallMarketplaceApp);
v4Router.post('/sandbox/evaluate', V4Controller.evaluateSandboxCode);

// --- 9. SaaS Monetization & Enterprise Platform ---
v4Router.get('/billing/subscription', V4Controller.getSubscription);
v4Router.post('/billing/change-plan', V4Controller.changePlan);
v4Router.get('/enterprise/overview', V4Controller.getEnterpriseOverview);
v4Router.put('/enterprise/policies/:orgId/:policyKey', V4Controller.updateEnterprisePolicy);
v4Router.get('/governance/audit', V4Controller.getGovernanceLogs);
v4Router.get('/governance/memories', V4Controller.getAiMemories);
v4Router.delete('/governance/memories/:id', V4Controller.forgetAiMemory);

// --- 10. Platform Observability & Chaos Testing ---
v4Router.get('/observability/apm', V4Controller.getApmMetrics);
v4Router.post('/observability/chaos', V4Controller.simulateChaos);
v4Router.get('/observability/regions', V4Controller.getGlobalRegions);
v4Router.get('/feature-flags', V4Controller.getFeatureFlags);
v4Router.post('/feature-flags/:flagKey/toggle', V4Controller.toggleFeatureFlag);
