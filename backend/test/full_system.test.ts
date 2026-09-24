import assert from 'node:assert';

// Overridable because port 5000 is occupied by macOS AirPlay Receiver on
// some machines (System Settings > General > AirDrop & Handoff to free it
// permanently) — same accommodation as test/v5.test.ts and
// test/v5_security.test.ts. Point this at whatever port the backend is
// actually running on, e.g. TEST_BASE_URL=http://localhost:5050/api.
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000/api';

async function runFullSystemAudit() {
  console.log('🔍 Starting Comprehensive End-to-End System Audit across V1, V2, V3, and V4...\n');

  // Step 1: Auth
  console.log('1. Testing Authentication...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'devang@focusintelligence.io',
      password: 'Password123!',
    }),
  });
  assert.strictEqual(loginRes.status, 200, 'Login failed');
  const { token, user } = (await loginRes.json()) as any;
  assert(token, 'Token missing');
  console.log(`   ✔ Logged in as: ${user.name} (${user.email})`);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Step 2: Version 1 Core Endpoints
  console.log('\n2. Testing Version 1 Core Endpoints...');
  const [overviewRes, trendsRes, categoriesRes, devicesRes, uploadsRes] = await Promise.all([
    fetch(`${BASE_URL}/analytics/overview`, { headers }),
    fetch(`${BASE_URL}/analytics/trends?days=7`, { headers }),
    fetch(`${BASE_URL}/analytics/categories`, { headers }),
    fetch(`${BASE_URL}/devices`, { headers }),
    fetch(`${BASE_URL}/uploads`, { headers }),
  ]);
  assert.strictEqual(overviewRes.status, 200, 'GET /analytics/overview failed');
  assert.strictEqual(trendsRes.status, 200, 'GET /analytics/trends failed');
  assert.strictEqual(categoriesRes.status, 200, 'GET /analytics/categories failed');
  assert.strictEqual(devicesRes.status, 200, 'GET /devices failed');
  assert.strictEqual(uploadsRes.status, 200, 'GET /uploads failed');
  console.log('   ✔ V1 Core Telemetry endpoints (overview, trends, categories, devices, uploads) OK');

  // Step 3: Version 2 Studio & Habit Endpoints
  console.log('\n3. Testing Version 2 Advanced Endpoints...');
  const [focusProfilesRes, blockRulesRes, routinesRes, automationsRes, gamificationRes, notifsRes, settingsRes] = await Promise.all([
    fetch(`${BASE_URL}/focus/profiles`, { headers }),
    fetch(`${BASE_URL}/blocking/rules`, { headers }),
    fetch(`${BASE_URL}/routines`, { headers }),
    fetch(`${BASE_URL}/automation/rules`, { headers }),
    fetch(`${BASE_URL}/gamification`, { headers }),
    fetch(`${BASE_URL}/notifications`, { headers }),
    fetch(`${BASE_URL}/settings`, { headers }),
  ]);
  assert.strictEqual(focusProfilesRes.status, 200, 'GET /focus/profiles failed');
  assert.strictEqual(blockRulesRes.status, 200, 'GET /blocking/rules failed');
  assert.strictEqual(routinesRes.status, 200, 'GET /routines failed');
  assert.strictEqual(automationsRes.status, 200, 'GET /automation/rules failed');
  assert.strictEqual(gamificationRes.status, 200, 'GET /gamification failed');
  assert.strictEqual(notifsRes.status, 200, 'GET /notifications failed');
  assert.strictEqual(settingsRes.status, 200, 'GET /settings failed');
  console.log('   ✔ V2 Endpoints (profiles, blocker, routines, automations, gamification, notifications, settings) OK');

  // Step 4: Version 3 Intelligence Endpoints
  console.log('\n4. Testing Version 3 Intelligent Ecosystem Endpoints...');
  const [coachRes, predictionsRes, goalsRes, plannerRes, extConfigRes, extEvalRes, circlesRes, keysRes, privacyRes] = await Promise.all([
    fetch(`${BASE_URL}/v3/coach/profile`, { headers }),
    fetch(`${BASE_URL}/v3/predictions`, { headers }),
    fetch(`${BASE_URL}/v3/goals`, { headers }),
    fetch(`${BASE_URL}/v3/planner`, { headers }),
    fetch(`${BASE_URL}/v3/extension/config`, { headers }),
    fetch(`${BASE_URL}/v3/extension/evaluate?domain=instagram.com`, { headers }),
    fetch(`${BASE_URL}/v3/circles`, { headers }),
    fetch(`${BASE_URL}/v3/developer/keys`, { headers }),
    fetch(`${BASE_URL}/v3/privacy/summary`, { headers }),
  ]);
  assert.strictEqual(coachRes.status, 200, 'GET /v3/coach/profile failed');
  assert.strictEqual(predictionsRes.status, 200, 'GET /v3/predictions failed');
  assert.strictEqual(goalsRes.status, 200, 'GET /v3/goals failed');
  assert.strictEqual(plannerRes.status, 200, 'GET /v3/planner failed');
  assert.strictEqual(extConfigRes.status, 200, 'GET /v3/extension/config failed');
  assert.strictEqual(extEvalRes.status, 200, 'GET /v3/extension/evaluate failed');
  assert.strictEqual(circlesRes.status, 200, 'GET /v3/circles failed');
  assert.strictEqual(keysRes.status, 200, 'GET /v3/developer/keys failed');
  assert.strictEqual(privacyRes.status, 200, 'GET /v3/privacy/summary failed');
  console.log('   ✔ V3 Endpoints (coach, predictions, goals, planner, extension, circles, keys, privacy) OK');

  // Step 5: Version 4 Autonomous OS Endpoints
  console.log('\n5. Testing Version 4 Autonomous OS Endpoints...');
  const [
    approvalsRes,
    approvalHistoryRes,
    workflowsRes,
    contextRes,
    knowledgeRes,
    searchRes,
    correlationsRes,
    simulateRes,
    adaptiveModelRes,
    coachingRes,
    reflectionsRes,
    integrationsRes,
    marketplaceRes,
    subscriptionRes,
    enterpriseRes,
    auditRes,
    apmRes,
    regionsRes,
    featureFlagsRes,
  ] = await Promise.all([
    fetch(`${BASE_URL}/v4/approvals/pending`, { headers }),
    fetch(`${BASE_URL}/v4/approvals/history`, { headers }),
    fetch(`${BASE_URL}/v4/workflows`, { headers }),
    fetch(`${BASE_URL}/v4/context`, { headers }),
    fetch(`${BASE_URL}/v4/knowledge`, { headers }),
    fetch(`${BASE_URL}/v4/search?q=focus`, { headers }),
    fetch(`${BASE_URL}/v4/behavioral/correlations`, { headers }),
    fetch(`${BASE_URL}/v4/simulations/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ shortFormReductionPct: 30, deepWorkIncreasePct: 20 }),
    }),
    fetch(`${BASE_URL}/v4/adaptive-model`, { headers }),
    fetch(`${BASE_URL}/v4/coaching/status`, { headers }),
    fetch(`${BASE_URL}/v4/reflections`, { headers }),
    fetch(`${BASE_URL}/v4/integrations`, { headers }),
    fetch(`${BASE_URL}/v4/marketplace`, { headers }),
    fetch(`${BASE_URL}/v4/billing/subscription`, { headers }),
    fetch(`${BASE_URL}/v4/enterprise/overview`, { headers }),
    fetch(`${BASE_URL}/v4/governance/audit`, { headers }),
    fetch(`${BASE_URL}/v4/observability/apm`, { headers }),
    fetch(`${BASE_URL}/v4/observability/regions`, { headers }),
    fetch(`${BASE_URL}/v4/feature-flags`, { headers }),
  ]);

  assert.strictEqual(approvalsRes.status, 200, 'GET /v4/approvals/pending failed');
  assert.strictEqual(approvalHistoryRes.status, 200, 'GET /v4/approvals/history failed');
  assert.strictEqual(workflowsRes.status, 200, 'GET /v4/workflows failed');
  assert.strictEqual(contextRes.status, 200, 'GET /v4/context failed');
  assert.strictEqual(knowledgeRes.status, 200, 'GET /v4/knowledge failed');
  assert.strictEqual(searchRes.status, 200, 'GET /v4/search failed');
  assert.strictEqual(correlationsRes.status, 200, 'GET /v4/behavioral/correlations failed');
  assert.strictEqual(simulateRes.status, 200, 'POST /v4/simulations/run failed');
  assert.strictEqual(adaptiveModelRes.status, 200, 'GET /v4/adaptive-model failed');
  assert.strictEqual(coachingRes.status, 200, 'GET /v4/coaching/status failed');
  assert.strictEqual(reflectionsRes.status, 200, 'GET /v4/reflections failed');
  assert.strictEqual(integrationsRes.status, 200, 'GET /v4/integrations failed');
  assert.strictEqual(marketplaceRes.status, 200, 'GET /v4/marketplace failed');
  assert.strictEqual(subscriptionRes.status, 200, 'GET /v4/billing/subscription failed');
  assert.strictEqual(enterpriseRes.status, 200, 'GET /v4/enterprise/overview failed');
  assert.strictEqual(auditRes.status, 200, 'GET /v4/governance/audit failed');
  assert.strictEqual(apmRes.status, 200, 'GET /v4/observability/apm failed');
  assert.strictEqual(regionsRes.status, 200, 'GET /v4/observability/regions failed');
  assert.strictEqual(featureFlagsRes.status, 200, 'GET /v4/feature-flags failed');

  console.log('   ✔ V4 Endpoints (approvals, workflows, context, knowledge, search, simulations, adaptive model, coaching, reflections, integrations, marketplace, billing, enterprise, apm, regions, flags) OK');

  // Step 6: Test Orchestrator Agent Dispatch
  console.log('\n6. Testing Autonomous Agent Swarm Dispatch...');
  const dispatchRes = await fetch(`${BASE_URL}/v4/orchestrator/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: 'Can you analyze my deep work capacity and plan my morning blocks?',
    }),
  });
  assert.strictEqual(dispatchRes.status, 200, 'POST /v4/orchestrator/query failed');
  const dispatchJson = (await dispatchRes.json()) as any;
  assert(dispatchJson.consolidatedAnswer, 'Dispatch did not return consolidated answer');
  console.log(`   ✔ Orchestrator Swarm responded with summary: "${dispatchJson.consolidatedAnswer.slice(0, 65)}..."`);

  // Step 7: Test Chaos Simulator Fallback
  console.log('\n7. Testing Chaos Simulator Fallback...');
  const chaosRes = await fetch(`${BASE_URL}/v4/observability/chaos`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ scenario: 'AI_PROVIDER_DOWN' }),
  });
  assert.strictEqual(chaosRes.status, 200, 'POST /v4/observability/chaos failed');
  const chaosJson = (await chaosRes.json()) as any;
  assert.strictEqual(chaosJson.circuitBreakerState, 'OPEN', 'Circuit breaker should be OPEN');
  assert.strictEqual(chaosJson.recoveryStatus, 'PASS', 'Recovery status should be PASS');
  assert.strictEqual(chaosJson.fallbackStrategy, 'LOCAL_DETERMINISTIC_HEURISTICS', 'Fallback strategy should be deterministic heuristics');
  console.log(`   ✔ Chaos Simulator verified: ${chaosJson.message}`);

  console.log('\n======================================================');
  console.log('🎉 FULL SYSTEM AUDIT COMPLETE: ALL VERSIONS (V1-V4) FULLY OPERATIONAL!');
  console.log('======================================================\n');
}

runFullSystemAudit().catch((err) => {
  console.error('❌ System Audit Failed:', err);
  process.exit(1);
});
