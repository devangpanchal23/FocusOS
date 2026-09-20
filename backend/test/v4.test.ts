import { prisma } from '../src/config/db.js';
import { OrchestratorService } from '../src/services/v4/orchestrator.service.js';
import { HumanInTheLoopService } from '../src/services/v4/humanInTheLoop.service.js';
import { WorkflowEngineService } from '../src/services/v4/workflowEngine.service.js';
import { ContextKnowledgeService } from '../src/services/v4/contextKnowledge.service.js';
import { BehavioralSimService } from '../src/services/v4/behavioralSim.service.js';
import { CoachingReflectionService } from '../src/services/v4/coachingReflection.service.js';
import { EcosystemMarketplaceService } from '../src/services/v4/ecosystemMarketplace.service.js';
import { SaasEnterpriseService } from '../src/services/v4/saasEnterprise.service.js';
import { PlatformOpsService } from '../src/services/v4/platformOps.service.js';

async function runV4Tests() {
  console.log('🚀 Starting FocusOS Version 4 Autonomous Intelligence Test Suite...\n');

  // Find demo user seeded in DB
  const user = await prisma.user.findUnique({
    where: { email: 'devang@focusintelligence.io' },
  });

  if (!user) {
    throw new Error('Demo user not found. Please run prisma:seed first.');
  }

  const userId = user.id;
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // 1. Multi-Agent Orchestrator
  console.log('[1/10] Testing Autonomous AI Agent Orchestrator...');
  const orchRes = await OrchestratorService.orchestrate(userId, 'I need to study for 3 hours tomorrow and I have two meetings.');
  assert(orchRes.delegatedAgents.includes('PlanningAgent'), 'PlanningAgent delegated for schedule query');
  assert(orchRes.delegatedAgents.includes('FocusAgent'), 'FocusAgent delegated for study environment');
  assert(orchRes.agentResults.length >= 2, 'Multiple specialized agents generated results');
  assert(orchRes.requiresApproval === true, 'High-impact blocking action correctly triggers approval requirement');
  assert(orchRes.approvalRequestId !== undefined, 'Pending ActionApprovalRequest created in database');

  // 2. Human-In-The-Loop Approval Pipeline
  console.log('\n[2/10] Testing Human-In-The-Loop Approval Pipeline...');
  const pendingApprovals = await HumanInTheLoopService.getPendingApprovals(userId);
  assert(pendingApprovals.length > 0, 'Pending approval queue retrieved');
  const reviewTarget = pendingApprovals[0];
  const reviewed = await HumanInTheLoopService.reviewApproval(userId, reviewTarget.id, 'APPROVED');
  assert(reviewed.status === 'EXECUTED', 'Action marked as EXECUTED upon explicit human approval');
  assert(reviewed.resultSummary !== null, 'Execution summary recorded');

  // 3. AI Workflow Engine
  console.log('\n[3/10] Testing AI Workflow Engine & Runner...');
  const newWorkflow = await WorkflowEngineService.createWorkflow(userId, {
    name: 'Test Anti-Distraction Circuit Breaker',
    description: 'Auto-shields reels when active session reaches 40m threshold',
    triggerType: 'SCREEN_TIME_THRESHOLD',
    triggerConfig: { thresholdMinutes: 40 },
    nodesJson: [
      { id: '1', type: 'trigger', label: 'Screen Time > 40m' },
      { id: '2', type: 'ai', label: 'Evaluate Distraction Velocity' },
      { id: '3', type: 'action', label: 'Shield Feeds' },
    ],
    edgesJson: [{ from: '1', to: '2' }, { from: '2', to: '3' }],
  });
  assert(newWorkflow.id !== undefined, 'Visual workflow persisted');
  const executionRes = await WorkflowEngineService.executeWorkflow(userId, newWorkflow.id);
  assert(executionRes.status === 'COMPLETED', 'Workflow executed through all node steps');
  assert(executionRes.stepsLog.length === 3, 'All 3 workflow steps logged with timestamps');

  // 4. Personal Context Engine
  console.log('\n[4/10] Testing Personal Context Engine...');
  const context = await ContextKnowledgeService.getContext(userId);
  assert(context.totalContexts > 0, 'Personal context retrieved');
  assert(context.observedCount > 0, 'Observed factual telemetry present');
  assert(context.assumptionsCount > 0, 'AI assumptions distinguished from facts');
  const updatedContext = await ContextKnowledgeService.upsertContext(userId, {
    contextType: 'GOAL',
    sourceType: 'USER_PREFERENCE',
    key: 'weekend_focus_target',
    value: '2 hours max on Saturdays',
    confidence: 1.0,
  });
  assert(updatedContext.key === 'weekend_focus_target', 'Personal context upserted');

  // 5. Universal Productivity Search
  console.log('\n[5/10] Testing Universal Productivity Search...');
  const searchResult = await ContextKnowledgeService.universalSearch(userId, 'deep');
  assert(searchResult.totalFound > 0, 'Universal search indexed matching records');
  assert(Array.isArray(searchResult.results), 'Categorized search results returned');

  // 6. Behavioral Intelligence & Scenario Simulation
  console.log('\n[6/10] Testing Behavioral Correlations & Scenario Simulation...');
  const correlations = await BehavioralSimService.getBehavioralCorrelations(userId);
  assert(correlations.correlations.length >= 3, 'Evidence-based multi-variable correlations generated');
  const simulation = await BehavioralSimService.runSimulation(userId, {
    deltaSocialMinutes: -30,
    extraStudyHours: 1.5,
    shiftFocusHour: 9,
  });
  assert(simulation.projected.attentionScore > simulation.baseline.attentionScore, 'Simulated attention score projected to increase');
  assert(simulation.disclaimer.includes('Estimated scenario'), 'Mandatory estimation disclaimer present');

  // 7. Adaptive Personal Productivity Model
  console.log('\n[7/10] Testing Adaptive Personal Productivity Model...');
  const model = await BehavioralSimService.getAdaptiveModel(userId);
  assert(model.optimalFocusMinutes > 0, 'Optimal focus interval learned');
  assert(Array.isArray(model.peakProductivityHours), 'Peak productivity windows tracked');
  const updatedModel = await BehavioralSimService.updateAdaptiveModel(userId, { optimalFocusMinutes: 42 });
  assert(updatedModel.optimalFocusMinutes === 42, 'Adaptive model parameter updated');

  // 8. AI Reflections & Continuous Goal Coaching
  console.log('\n[8/10] Testing AI Reflections & Goal Coaching...');
  const coachingStatus = await CoachingReflectionService.getCoachingStatus(userId);
  assert(coachingStatus.goals.length > 0, 'Active SMART goals evaluated for velocity and blockers');
  const submittedReflection = await CoachingReflectionService.submitReflection(userId, {
    periodType: 'DAILY',
    whatWentWell: 'Completed full backend architecture for Version 4 without distraction.',
    whatDistracted: 'None today.',
    improvementGoal: 'Verify automated test suite.',
    proudOf: 'Delivered autonomous agent orchestrator.',
  });
  assert(submittedReflection.recurringThemes.length > 0, 'Themes extracted from reflection response');
  assert(typeof submittedReflection.aiSynthesis === 'string', 'AI synthesis generated for journal');

  // 9. Ecosystem, Device Orchestration & Marketplace
  console.log('\n[9/10] Testing Ecosystem, Integrations & Marketplace...');
  const integrations = await EcosystemMarketplaceService.getIntegrations(userId);
  assert(integrations.length >= 4, 'Third-party integrations catalog retrieved');
  const catalog = await EcosystemMarketplaceService.getMarketplaceCatalog();
  assert(catalog.length >= 3, 'Marketplace third-party apps available');
  const installed = await EcosystemMarketplaceService.installApp(userId, catalog[0].slug);
  assert(installed.status === 'INSTALLED', 'Marketplace app installed with granted permissions');

  // 10. SaaS Monetization, Billing & Chaos Simulator
  console.log('\n[10/10] Testing SaaS Monetization, Enterprise & Chaos Simulator...');
  const sub = await SaasEnterpriseService.getSubscription(userId);
  assert(sub.subscription.planName === 'PRO', 'User subscription tier verified');
  assert(sub.invoices.length > 0, 'Billing invoices loaded');

  const chaosResult = await PlatformOpsService.simulateChaos('AI_PROVIDER_DOWN');
  assert(chaosResult.recoveryStatus === 'PASS', 'Chaos test passed with graceful fallback heuristics');

  const apm = await PlatformOpsService.getApmMetrics();
  assert(apm.systemHealth === 'HEALTHY', 'APM health metrics reported');
  assert(apm.aiCostOptimization.costSavingsUsd > 0, 'AI token routing and cost savings measured');

  console.log(`\n==============================================`);
  console.log(`🎯 Version 4 Integration Tests Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runV4Tests()
  .catch((err) => {
    console.error('Fatal test failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
