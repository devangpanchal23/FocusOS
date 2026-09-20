import { Request, Response } from 'express';
import { OrchestratorService } from '../../services/v4/orchestrator.service.js';
import { HumanInTheLoopService } from '../../services/v4/humanInTheLoop.service.js';
import { WorkflowEngineService } from '../../services/v4/workflowEngine.service.js';
import { ContextKnowledgeService } from '../../services/v4/contextKnowledge.service.js';
import { BehavioralSimService } from '../../services/v4/behavioralSim.service.js';
import { CoachingReflectionService } from '../../services/v4/coachingReflection.service.js';
import { EcosystemMarketplaceService } from '../../services/v4/ecosystemMarketplace.service.js';
import { SaasEnterpriseService } from '../../services/v4/saasEnterprise.service.js';
import { PlatformOpsService } from '../../services/v4/platformOps.service.js';

export class V4Controller {
  // 1. Autonomous AI Agent Orchestrator
  static async orchestrate(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }
      const response = await OrchestratorService.orchestrate(userId, query);
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAgentLogs(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const logs = await OrchestratorService.getAgentLogs(userId);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 2. Human-In-The-Loop Approval Pipeline
  static async getPendingApprovals(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const approvals = await HumanInTheLoopService.getPendingApprovals(userId);
      res.json(approvals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getApprovalHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const history = await HumanInTheLoopService.getApprovalHistory(userId);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async reviewApproval(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;
      const { decision } = req.body; // 'APPROVED' | 'REJECTED'
      if (!['APPROVED', 'REJECTED'].includes(decision)) {
        return res.status(400).json({ error: 'Decision must be APPROVED or REJECTED' });
      }
      const updated = await HumanInTheLoopService.reviewApproval(userId, id, decision);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createApproval(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const created = await HumanInTheLoopService.createApprovalRequest(userId, req.body);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 3. AI Workflows
  static async getWorkflows(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const workflows = await WorkflowEngineService.getWorkflows(userId);
      res.json(workflows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createWorkflow(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const created = await WorkflowEngineService.createWorkflow(userId, req.body);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateWorkflow(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;
      const updated = await WorkflowEngineService.updateWorkflow(userId, id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteWorkflow(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;
      await WorkflowEngineService.deleteWorkflow(userId, id);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async executeWorkflow(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;
      const result = await WorkflowEngineService.executeWorkflow(userId, id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 4. Personal Context Engine & Knowledge Vault
  static async getContext(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const context = await ContextKnowledgeService.getContext(userId);
      res.json(context);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async upsertContext(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const updated = await ContextKnowledgeService.upsertContext(userId, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteContext(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { key } = req.params;
      await ContextKnowledgeService.deleteContext(userId, key);
      res.json({ success: true, key });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getKnowledgeItems(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { category, query } = req.query;
      const items = await ContextKnowledgeService.getKnowledgeItems(userId, category as string, query as string);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async createKnowledgeItem(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const created = await ContextKnowledgeService.createKnowledgeItem(userId, req.body);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateKnowledgeItem(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;
      const updated = await ContextKnowledgeService.updateKnowledgeItem(userId, id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteKnowledgeItem(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;
      await ContextKnowledgeService.deleteKnowledgeItem(userId, id);
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 5. Universal Productivity Search
  static async universalSearch(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const query = (req.query.q as string) || '';
      const results = await ContextKnowledgeService.universalSearch(userId, query);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 6. Behavioral Intelligence & Scenario Simulation
  static async getCorrelations(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const data = await BehavioralSimService.getBehavioralCorrelations(userId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async runSimulation(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { deltaSocialMinutes, extraStudyHours, shiftFocusHour } = req.body;
      const result = await BehavioralSimService.runSimulation(userId, {
        deltaSocialMinutes: Number(deltaSocialMinutes || 0),
        extraStudyHours: Number(extraStudyHours || 0),
        shiftFocusHour: shiftFocusHour ? Number(shiftFocusHour) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async saveSimulation(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { name, parameters, baseline, projected } = req.body;
      const saved = await BehavioralSimService.saveSimulation(userId, name, parameters, baseline, projected);
      res.status(201).json(saved);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getSavedSimulations(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const simulations = await BehavioralSimService.getSavedSimulations(userId);
      res.json(simulations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAdaptiveModel(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const model = await BehavioralSimService.getAdaptiveModel(userId);
      res.json(model);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateAdaptiveModel(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const updated = await BehavioralSimService.updateAdaptiveModel(userId, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async resetAdaptiveModel(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const reset = await BehavioralSimService.resetAdaptiveModel(userId);
      res.json(reset);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 7. AI Goal Coaching & Reflections
  static async getCoachingStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const status = await CoachingReflectionService.getCoachingStatus(userId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async proposeRevisedPlan(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { goalId } = req.params;
      const plan = await CoachingReflectionService.proposeRevisedPlan(userId, goalId);
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getReflections(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const periodType = req.query.periodType as any;
      const entries = await CoachingReflectionService.getReflections(userId, periodType);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async submitReflection(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const entry = await CoachingReflectionService.submitReflection(userId, req.body);
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 8. Device Orchestration & Ecosystem
  static async getDevices(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const devices = await EcosystemMarketplaceService.getDevices(userId);
      res.json(devices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async triggerDeviceSync(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;
      const result = await EcosystemMarketplaceService.triggerDeviceSync(userId, id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getIntegrations(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const integrations = await EcosystemMarketplaceService.getIntegrations(userId);
      res.json(integrations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async toggleIntegration(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { provider } = req.params;
      const { isConnected } = req.body;
      const updated = await EcosystemMarketplaceService.toggleIntegration(userId, provider, isConnected);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async syncIntegration(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { provider } = req.params;
      const result = await EcosystemMarketplaceService.syncIntegration(userId, provider);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getMarketplaceCatalog(req: Request, res: Response) {
    try {
      const { category, query } = req.query;
      const apps = await EcosystemMarketplaceService.getMarketplaceCatalog(category as string, query as string);
      res.json(apps);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async installMarketplaceApp(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { slug } = req.params;
      const result = await EcosystemMarketplaceService.installApp(userId, slug);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async uninstallMarketplaceApp(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { slug } = req.params;
      const result = await EcosystemMarketplaceService.uninstallApp(userId, slug);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async evaluateSandboxCode(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { code, permissions } = req.body;
      const result = await EcosystemMarketplaceService.evaluateSandboxCode(userId, code || '', permissions || []);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 9. SaaS Monetization & Enterprise
  static async getSubscription(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const sub = await SaasEnterpriseService.getSubscription(userId);
      res.json(sub);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async changePlan(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { planName } = req.body;
      const updated = await SaasEnterpriseService.changePlan(userId, planName);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getEnterpriseOverview(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const overview = await SaasEnterpriseService.getEnterpriseOverview(userId);
      res.json(overview);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updateEnterprisePolicy(req: Request, res: Response) {
    try {
      const { orgId, policyKey } = req.params;
      const { policyValue, enforcementLevel } = req.body;
      const updated = await SaasEnterpriseService.updateEnterprisePolicy(orgId, policyKey, policyValue, enforcementLevel);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getGovernanceLogs(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const logs = await SaasEnterpriseService.getGovernanceLogs(userId);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getAiMemories(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const memories = await SaasEnterpriseService.getAiMemories(userId);
      res.json(memories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async forgetAiMemory(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;
      const result = await SaasEnterpriseService.forgetAiMemory(userId, id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 10. Platform Observability & Chaos
  static async getApmMetrics(_req: Request, res: Response) {
    try {
      const metrics = await PlatformOpsService.getApmMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async simulateChaos(req: Request, res: Response) {
    try {
      const { scenario } = req.body;
      const result = await PlatformOpsService.simulateChaos(scenario || 'DB_LATENCY');
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getGlobalRegions(_req: Request, res: Response) {
    try {
      const regions = await PlatformOpsService.getGlobalRegions();
      res.json(regions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getFeatureFlags(_req: Request, res: Response) {
    try {
      const flags = await PlatformOpsService.getFeatureFlags();
      res.json(flags);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async toggleFeatureFlag(req: Request, res: Response) {
    try {
      const { flagKey } = req.params;
      const { isEnabled } = req.body;
      const updated = await PlatformOpsService.toggleFeatureFlag(flagKey, isEnabled);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
