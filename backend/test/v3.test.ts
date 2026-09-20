import { prisma } from '../src/config/db.js';
import { AiAssistantService } from '../src/services/aiAssistant.service.js';
import { AiCoachService } from '../src/services/aiCoach.service.js';
import { PredictiveService } from '../src/services/predictive.service.js';
import { GoalService } from '../src/services/goal.service.js';
import { DailyPlannerService } from '../src/services/dailyPlanner.service.js';
import { ExtensionService } from '../src/services/extension.service.js';
import { CollaborationService } from '../src/services/collaboration.service.js';
import { DeveloperService } from '../src/services/developer.service.js';
import { PrivacyService } from '../src/services/privacy.service.js';

async function runV3Tests() {
  console.log('🚀 Starting FocusOS Version 3 Integration Test Suite...\n');

  // Find demo user seeded earlier
  const user = await prisma.user.findUnique({
    where: { email: 'devang@focusintelligence.io' },
  });

  if (!user) {
    throw new Error('Demo user not found. Please run seed first.');
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

  // 1. AI Assistant & Telemetry Grounding
  console.log('[1/9] Testing AI Assistant Telemetry Engine...');
  const asstResp = await AiAssistantService.askAssistant(userId, 'How much time did I spend on YouTube today?');
  assert(typeof asstResp.answer === 'string' && asstResp.answer.length > 10, 'AI Assistant returns detailed answer');
  assert(Array.isArray(asstResp.evidence), 'AI Assistant returns evidence array');
  assert(asstResp.metricsContext !== undefined, 'AI Assistant context contains today metrics');

  // 2. AI Coach Persona
  console.log('\n[2/9] Testing AI Coach & Persona Modes...');
  const coachProfile = await AiCoachService.getProfile(userId);
  assert(coachProfile.userId === userId, 'Coach profile retrieved for user');
  const updatedCoach = await AiCoachService.updateProfile(userId, { mode: 'CODING', targetDailyFocusHours: 4.5 });
  assert(updatedCoach.mode === 'CODING', 'Coach mode updated to CODING');
  const assessment = await AiCoachService.getCoachAssessment(userId);
  assert(typeof assessment.priorityDirective === 'string', 'Dynamic coaching directive generated');

  // 3. Predictive & Risk Engine
  console.log('\n[3/9] Testing Predictive Analytics & Risk Engine...');
  const predictions = await PredictiveService.getPredictionSummary(userId);
  assert(predictions.projectedScreenTimeMinutes > 0, 'Projected end-of-day screen time computed');
  assert(predictions.hourlyVulnerabilityForecast.length === 12, '12-hour vulnerability forecast computed');
  const risks = await PredictiveService.detectAndSyncRisks(userId);
  assert(Array.isArray(risks), 'Behavioral risk logs detected and synced');

  // 4. SMART Goals Engine
  console.log('\n[4/9] Testing SMART Goals Engine...');
  const goals = await GoalService.getGoals(userId);
  assert(goals.length > 0, 'User SMART goals retrieved with live progress');
  assert(typeof goals[0].progressPercent === 'number', 'Progress percent calculated from telemetry');
  const generatedPlan = await GoalService.generateAiPlan('I want to study 3 hours without shorts');
  assert(generatedPlan.suggestedTitle.length > 5, 'AI goal plan synthesized from plain English');

  // 5. AI Daily Planner
  console.log('\n[5/9] Testing AI Daily Planner...');
  const todayStr = new Date().toISOString().split('T')[0];
  const plan = await DailyPlannerService.getDailyPlan(userId, todayStr);
  assert(plan.blocks.length >= 4, 'Daily plan blocks synthesized into chronological schedule');
  if (plan.blocks.length > 0) {
    const toggled = await DailyPlannerService.toggleBlockCompletion(userId, plan.blocks[0].id);
    assert(toggled.isCompleted !== undefined, 'Block completion toggled successfully');
  }

  // 6. Browser Extension Companion Sync
  console.log('\n[6/9] Testing Extension Companion Sync...');
  const extConfig = await ExtensionService.getExtensionConfig(userId);
  const evaluation = await ExtensionService.evaluateDomain(userId, 'https://www.instagram.com/explore');
  assert(Array.isArray(extConfig.blockedDomains), 'Extension config returns active blocked domains');
  assert(evaluation.blocked === true, 'Distractor domain correctly evaluated as blocked');

  // 7. Social Accountability Circles
  console.log('\n[7/9] Testing Accountability Circles & Leaderboard...');
  const circles = await CollaborationService.getUserCircles(userId);
  assert(circles.length > 0, 'User accountability circles retrieved');
  const leaderboard = await CollaborationService.getCircleLeaderboard(userId, circles[0].id);
  assert(leaderboard.leaderboard.length > 0, 'Privacy-preserving leaderboard computed');
  assert(leaderboard.leaderboard[0].attentionScore >= 0, 'Leaderboard exposes privacy-safe Attention Score');

  // 8. Developer Platform (API Keys & Webhooks)
  console.log('\n[8/9] Testing Developer API Keys & Webhooks...');
  const testKey = await DeveloperService.createApiKey(userId, 'Test Suite Key');
  assert(testKey.rawKey.startsWith('fk_live_'), 'API key generated with prefix fk_live_');
  const validatedKey = await DeveloperService.validateApiKey(testKey.rawKey);
  assert(validatedKey !== null && validatedKey.userId === userId, 'SHA-256 hashed API key successfully validated');
  await DeveloperService.revokeApiKey(userId, testKey.id);

  // 9. Privacy Center & Data Sovereignty
  console.log('\n[9/9] Testing Privacy Center...');
  const privacySummary = await PrivacyService.getPrivacySummary(userId);
  assert(privacySummary.dataInventory.dailyMetrics >= 0, 'Data inventory counts verified');
  assert(privacySummary.encryptionStatus.atRest === 'AES-256-GCM', 'Encryption at rest confirmed');

  console.log(`\n==============================================`);
  console.log(`🎯 Version 3 Integration Tests Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runV3Tests()
  .catch((err) => {
    console.error('Fatal test failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
