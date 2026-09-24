import { prisma } from '../src/config/db.js';
import { EventStoreService } from '../src/services/v5/eventStore.service.js';
import { AutomationService } from '../src/services/automation.service.js';

// This suite hits a REAL running server (same real-HTTP style as
// test/full_system.test.ts) since it exercises auth/sync-token headers and
// controller wiring, not just service logic. Start the backend first:
//   PORT=5050 npx tsx src/index.ts   (or npm run dev, then adjust BASE_URL)
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5050/api';

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

async function json(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function runV5Tests() {
  console.log('🚀 Starting FocusOS Version 5.1 Unified Event Architecture Test Suite...\n');

  const user = await prisma.user.findUnique({ where: { email: 'devang@focusintelligence.io' } });
  if (!user) throw new Error('Demo user not found. Please run prisma:seed first.');
  const userId = user.id;

  // --- Auth ---
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'devang@focusintelligence.io', password: 'Password123!' }),
  });
  const loginJson: any = await json(loginRes);
  assert(loginRes.status === 200 && !!loginJson?.token, 'Login succeeds for seeded user');
  const token = loginJson.token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const todayStr = new Date().toISOString().split('T')[0];

  // ==========================================================
  // 1. INGESTION
  // ==========================================================
  console.log('\n[1/8] Testing Ingestion (EventStoreService + retry semantics)...');

  const dataSource = await EventStoreService.getOrCreateDataSource(userId, 'DESKTOP_AGENT', null);

  const ingestOk = await EventStoreService.ingest(userId, dataSource.id, null, [
    {
      eventType: 'APP_SESSION',
      occurredAt: new Date(),
      durationSeconds: 120,
      applicationName: 'Visual Studio Code',
      categoryName: 'Development',
    },
  ]);
  assert(ingestOk.ingested === 1 && ingestOk.failed === 0, 'Well-formed event ingests successfully');

  const rawProcessed = await prisma.rawEvent.findFirst({
    where: { userId, dataSourceId: dataSource.id, processingStatus: 'PROCESSED' },
    orderBy: { receivedAt: 'desc' },
  });
  assert(!!rawProcessed, 'Successful ingest reaches PROCESSED RawEvent status');

  // Force a failure path: ingest against a dataSourceId that does NOT belong
  // to this user (invalid dataSource ownership) — EventStoreService.ingest
  // marks the whole batch as failed without ever creating a RawEvent, so we
  // instead manufacture a RawEvent directly in a state that reprocessRawEvent
  // will fail on, to exercise the real retry/failure bookkeeping in
  // EventStoreService.reprocessRawEvent (transformRawEvent throws because
  // the payload references a category/app that can't resolve cleanly is not
  // actually guaranteed to throw — NormalizationService.resolveApplication
  // creates unknown apps rather than failing — so instead we simulate an
  // already-FAILED RawEvent with a corrupt payloadJson, which IS guaranteed
  // to throw JSON.parse inside reprocessRawEvent).
  const corruptRaw = await prisma.rawEvent.create({
    data: {
      userId,
      dataSourceId: dataSource.id,
      deviceId: null,
      eventHash: `test-corrupt-${Date.now()}-${Math.random()}`,
      payloadJson: '{not valid json',
      occurredAt: new Date(),
      processingStatus: 'FAILED',
      retryCount: 0,
      errorMessage: 'seeded failure for test',
    },
  });

  const reprocess1 = await EventStoreService.reprocessRawEvent(corruptRaw.id);
  assert(reprocess1.success === false, 'reprocessRawEvent fails on malformed payload');

  const afterFirstRetry = await prisma.rawEvent.findUnique({ where: { id: corruptRaw.id } });
  assert(!!afterFirstRetry && afterFirstRetry.retryCount === 1, 'retryCount increments after a failed reprocess attempt');
  assert(
    afterFirstRetry?.processingStatus === 'RETRYING' || afterFirstRetry?.processingStatus === 'PERMANENTLY_FAILED',
    'Status moves to RETRYING (or PERMANENTLY_FAILED once maxRetries hit) after failure'
  );

  // Ingestion stats endpoint (real HTTP)
  const statsRes = await fetch(`${BASE_URL}/v5/ingestion/stats`, { headers });
  const statsJson: any = await json(statsRes);
  assert(statsRes.status === 200 && !!statsJson?.counts, 'GET /v5/ingestion/stats returns processing-status counts');

  // ==========================================================
  // 2. BROWSER INTELLIGENCE
  // ==========================================================
  console.log('\n[2/8] Testing Browser Intelligence...');

  // Ensure a clean exclusion rule for a domain we'll test against.
  await prisma.browserExclusionRule.deleteMany({ where: { userId, domainPattern: 'excluded-test-domain.com' } });
  const exclRes = await fetch(`${BASE_URL}/v5/browser/exclusions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ domainPattern: 'excluded-test-domain.com', reason: 'v5 test' }),
  });
  assert(exclRes.status === 201, 'POST /v5/browser/exclusions creates an exclusion rule');

  const sessionIngestRes = await fetch(`${BASE_URL}/v5/browser/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sessions: [
        { domain: 'github.com', startedAt: new Date().toISOString(), durationSeconds: 300, title: 'GitHub' },
        { domain: 'excluded-test-domain.com', startedAt: new Date().toISOString(), durationSeconds: 100 },
      ],
    }),
  });
  const sessionIngestJson: any = await json(sessionIngestRes);
  assert(sessionIngestRes.status === 201, 'POST /v5/browser/sessions accepts a session batch');
  assert(sessionIngestJson?.excluded === 1, 'Exclusion rule prevents the matching domain from being stored');
  assert(sessionIngestJson?.accepted === 1, 'Non-excluded domain is accepted for ingestion');

  const domainsRes = await fetch(`${BASE_URL}/v5/browser/domains`, { headers });
  const domainsJson: any = await json(domainsRes);
  const hasExcludedDomain = domainsJson?.domains?.some((d: any) => d.domain === 'excluded-test-domain.com');
  assert(domainsRes.status === 200 && !hasExcludedDomain, 'Excluded domain never appears in domain analytics');

  // Multi-instance: two distinct instanceKeys create two distinct DataSource rows.
  const instanceA = `test-instance-a-${Date.now()}`;
  const instanceB = `test-instance-b-${Date.now()}`;
  await fetch(`${BASE_URL}/v5/browser/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      instanceKey: instanceA,
      browserLabel: 'Brave on Test Rig',
      sessions: [{ domain: 'instance-a-test.com', startedAt: new Date().toISOString(), durationSeconds: 60 }],
    }),
  });
  await fetch(`${BASE_URL}/v5/browser/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      instanceKey: instanceB,
      browserLabel: 'Chrome on Test Rig',
      sessions: [{ domain: 'instance-b-test.com', startedAt: new Date().toISOString(), durationSeconds: 60 }],
    }),
  });
  const instancesRes = await fetch(`${BASE_URL}/v5/browser/instances`, { headers });
  const instancesJson: any = await json(instancesRes);
  const foundA = instancesJson?.instances?.some((i: any) => i.instanceKey === instanceA);
  const foundB = instancesJson?.instances?.some((i: any) => i.instanceKey === instanceB);
  assert(instancesRes.status === 200 && foundA && foundB, 'Distinct instanceKeys create distinct DataSource/browser-instance rows');

  // ==========================================================
  // 3. DESKTOP COMPANION
  // ==========================================================
  console.log('\n[3/8] Testing Desktop Companion...');

  const regRes = await fetch(`${BASE_URL}/v5/desktop/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'V5 Test Desktop', os: 'MACOS' }),
  });
  const regJson: any = await json(regRes);
  assert(regRes.status === 201 && !!regJson?.syncToken, 'POST /v5/desktop/register returns a syncToken');
  const syncToken = regJson.syncToken;
  const syncHeaders = { 'Content-Type': 'application/json', 'X-Sync-Token': syncToken };

  const desktopSyncRes = await fetch(`${BASE_URL}/v5/desktop/sync`, {
    method: 'POST',
    headers: syncHeaders,
    body: JSON.stringify({
      events: [
        { occurredAt: new Date().toISOString(), durationSeconds: 200, appName: 'Visual Studio Code', title: 'index.ts' },
        { occurredAt: new Date().toISOString(), type: 'SLEEP', durationSeconds: 0 },
        { occurredAt: new Date().toISOString(), type: 'WAKE', durationSeconds: 0 },
        { occurredAt: new Date().toISOString(), type: 'LOCK', durationSeconds: 0 },
        { occurredAt: new Date().toISOString(), type: 'UNLOCK', durationSeconds: 0 },
      ],
    }),
  });
  const desktopSyncJson: any = await json(desktopSyncRes);
  assert(desktopSyncRes.status === 200 && desktopSyncJson?.ingested === 5, 'Desktop sync ingests app-session + all 4 power-state events');

  const powerEvents = await prisma.unifiedEvent.findMany({
    where: { userId, eventType: { in: ['SLEEP', 'WAKE', 'LOCK', 'UNLOCK'] }, deviceId: regJson.device.id },
  });
  const powerTypes = new Set(powerEvents.map((e) => e.eventType));
  assert(
    powerTypes.has('SLEEP') && powerTypes.has('WAKE') && powerTypes.has('LOCK') && powerTypes.has('UNLOCK'),
    'SLEEP/WAKE/LOCK/UNLOCK events are stored with their correct eventType'
  );

  // Privacy settings: exclude an application, confirm matching events are dropped server-side.
  await fetch(`${BASE_URL}/v5/desktop/settings`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ excludedApplications: ['Secret Diary App'] }),
  });
  const beforeCount = await prisma.unifiedEvent.count({ where: { userId, deviceId: regJson.device.id } });
  const excludedSyncRes = await fetch(`${BASE_URL}/v5/desktop/sync`, {
    method: 'POST',
    headers: syncHeaders,
    body: JSON.stringify({
      events: [{ occurredAt: new Date().toISOString(), durationSeconds: 90, appName: 'Secret Diary App' }],
    }),
  });
  const excludedSyncJson: any = await json(excludedSyncRes);
  const afterCount = await prisma.unifiedEvent.count({ where: { userId, deviceId: regJson.device.id } });
  assert(
    excludedSyncRes.status === 200 && excludedSyncJson?.ingested === 0 && afterCount === beforeCount,
    'Excluded application events are dropped server-side by privacy settings, never stored'
  );
  // Reset the exclusion so it doesn't leak into other assertions.
  await fetch(`${BASE_URL}/v5/desktop/settings`, { method: 'PUT', headers, body: JSON.stringify({ excludedApplications: [] }) });

  // ==========================================================
  // 4. SHORT-FORM INTELLIGENCE
  // ==========================================================
  console.log('\n[4/8] Testing Short-Form Intelligence...');

  const sfSyncRes = await fetch(`${BASE_URL}/v5/short-form/sync`, { method: 'POST', headers });
  const sfSyncJson: any = await json(sfSyncRes);
  assert(sfSyncRes.status === 200 && typeof sfSyncJson?.totalCreated === 'number', 'POST /v5/short-form/sync runs and reports totalCreated');

  const estimatedCount = await prisma.shortFormSession.count({ where: { userId, dataQuality: 'ESTIMATED' } });
  assert(estimatedCount > 0, 'Syncing from daily aggregates (seed has 7 days of shortFormMinutes) produces ESTIMATED sessions');

  const hotspotsRes = await fetch(`${BASE_URL}/v5/short-form/hotspots`, { headers });
  const hotspotsJson: any = await json(hotspotsRes);
  assert(hotspotsRes.status === 200 && Array.isArray(hotspotsJson?.hotspots), 'GET /v5/short-form/hotspots returns a hotspots array shape');

  const platformsRes = await fetch(`${BASE_URL}/v5/short-form/platforms`, { headers });
  const platformsJson: any = await json(platformsRes);
  assert(platformsRes.status === 200 && Array.isArray(platformsJson?.platforms), 'GET /v5/short-form/platforms returns a platforms array shape');

  // ==========================================================
  // 5. TIMELINE
  // ==========================================================
  console.log('\n[5/8] Testing Unified Timeline...');

  const timelineRes = await fetch(`${BASE_URL}/v5/timeline?from=${todayStr}&to=${todayStr}&limit=50`, { headers });
  const timelineJson: any = await json(timelineRes);
  assert(timelineRes.status === 200 && Array.isArray(timelineJson?.events), 'GET /v5/timeline returns an events array');
  let orderedDesc = true;
  for (let i = 1; i < (timelineJson?.events?.length || 0); i++) {
    if (new Date(timelineJson.events[i - 1].startedAt).getTime() < new Date(timelineJson.events[i].startedAt).getTime()) {
      orderedDesc = false;
      break;
    }
  }
  assert(orderedDesc, 'Timeline events are ordered newest-first (keyset pagination)');

  const devDesktopId = regJson.device.id;
  const deviceFilterRes = await fetch(`${BASE_URL}/v5/timeline?from=${todayStr}&to=${todayStr}&deviceIds=${devDesktopId}`, { headers });
  const deviceFilterJson: any = await json(deviceFilterRes);
  const onlyThatDevice = (deviceFilterJson?.events || []).every((e: any) => e.device?.id === devDesktopId);
  assert(deviceFilterRes.status === 200 && onlyThatDevice, 'Device filter narrows timeline results to the requested device');

  const sourceFilterRes = await fetch(`${BASE_URL}/v5/timeline?from=${todayStr}&to=${todayStr}&sourceTypes=BROWSER_EXTENSION`, { headers });
  const sourceFilterJson: any = await json(sourceFilterRes);
  const onlyBrowser = (sourceFilterJson?.events || []).every((e: any) => e.sourceType === 'BROWSER_EXTENSION');
  assert(sourceFilterRes.status === 200 && onlyBrowser, 'sourceTypes filter narrows timeline results correctly');

  const searchRes = await fetch(`${BASE_URL}/v5/timeline?from=${todayStr}&to=${todayStr}&search=github`, { headers });
  const searchJson: any = await json(searchRes);
  const searchMatches = (searchJson?.events || []).some(
    (e: any) => e.domain?.includes('github') || e.title?.toLowerCase().includes('github') || e.application?.name?.toLowerCase().includes('github')
  );
  assert(searchRes.status === 200 && (searchJson.events.length === 0 || searchMatches), 'search=github matches domain/app/title as expected');

  const daySummaryRes = await fetch(`${BASE_URL}/v5/timeline/day-summary?date=${todayStr}`, { headers });
  const daySummaryJson: any = await json(daySummaryRes);
  assert(daySummaryRes.status === 200 && Array.isArray(daySummaryJson?.hourly) && daySummaryJson.hourly.length === 24, 'GET /v5/timeline/day-summary returns 24 hourly buckets');

  // ==========================================================
  // 6. PERSONAL TIME INTELLIGENCE
  // ==========================================================
  console.log('\n[6/8] Testing Personal Time Intelligence...');

  const tiSummaryRes = await fetch(`${BASE_URL}/v5/time-intelligence/summary`, { headers });
  const tiSummaryJson: any = await json(tiSummaryRes);
  assert(tiSummaryRes.status === 200 && typeof tiSummaryJson?.sufficientData === 'boolean', 'GET /v5/time-intelligence/summary reports sufficientData');
  // Seed only has 7 days of DailyMetric history; honestly assert whatever the
  // real coverage says rather than assuming a specific boolean.
  console.log(`     (coverageDays=${tiSummaryJson?.coverageDays}, sufficientData=${tiSummaryJson?.sufficientData})`);
  assert(typeof tiSummaryJson?.coverageDays === 'number', 'coverageDays is reported numerically (honest baseline disclosure)');

  const anomaliesRes = await fetch(`${BASE_URL}/v5/time-intelligence/anomalies?date=${todayStr}`, { headers });
  const anomaliesJson: any = await json(anomaliesRes);
  assert(anomaliesRes.status === 200 && Array.isArray(anomaliesJson?.anomalies), 'GET /v5/time-intelligence/anomalies returns an anomalies array (possibly empty if baseline insufficient)');

  const distractionWindowsRes = await fetch(`${BASE_URL}/v5/time-intelligence/distraction-windows?date=${todayStr}`, { headers });
  const distractionWindowsJson: any = await json(distractionWindowsRes);
  assert(distractionWindowsRes.status === 200 && Array.isArray(distractionWindowsJson?.windows), 'GET /v5/time-intelligence/distraction-windows returns a sane windows array shape');

  const contextSwitchRes = await fetch(`${BASE_URL}/v5/time-intelligence/context-switching?date=${todayStr}`, { headers });
  const contextSwitchJson: any = await json(contextSwitchRes);
  assert(contextSwitchRes.status === 200 && typeof contextSwitchJson?.totalSwitches === 'number', 'GET /v5/time-intelligence/context-switching returns a sane shape');

  // ==========================================================
  // 7. AUTOMATION
  // ==========================================================
  console.log('\n[7/8] Testing Automation (AND/OR conditions, cooldown, dry-run)...');

  // The seed script writes its "last 7 days including today" DailyMetric rows
  // relative to whenever `npm run prisma:seed` was last executed — if that was
  // on an earlier calendar day, there may be NO DailyMetric row for the
  // actual current date, and AutomationService's trigger evaluation
  // (computeActualValue / evaluateRules) always reads today's real date. So
  // we upsert a deterministic DailyMetric for today directly, rather than
  // depending on stale seed freshness — this is exactly the "create fresh
  // throwaway data where a clean slate matters" case called out in the task.
  const screenTime = 300;
  const shortForm = 120;
  await prisma.dailyMetric.upsert({
    where: { userId_date: { userId, date: todayStr } },
    update: { totalScreenTimeMinutes: screenTime, shortFormMinutes: shortForm },
    create: {
      userId,
      date: todayStr,
      totalScreenTimeMinutes: screenTime,
      activeMinutes: screenTime - 20,
      backgroundMinutes: 20,
      shortFormMinutes: shortForm,
      productiveMinutes: 100,
      entertainmentMinutes: 30,
      socialMinutes: 50,
      communicationMinutes: 10,
      reelCount: 200,
      notificationCount: 100,
      unlockCount: 40,
      attentionScore: 70,
      dataConfidence: 1.0,
      coverageStatus: 'CONFIRMED',
    },
  });
  const todayMetric = await prisma.dailyMetric.findUnique({ where: { userId_date: { userId, date: todayStr } } });
  assert(!!todayMetric && todayMetric.totalScreenTimeMinutes === screenTime, 'Deterministic DailyMetric for today is in place for automation trigger tests');

  // AND rule (conditionLogic='ALL'): both conditions must pass — one designed
  // to definitely pass (well below today's screen time), one to definitely fail
  // (well above today's short-form minutes) so wouldTrigger must be false.
  const andRule = await prisma.automationRule.create({
    data: {
      userId,
      name: 'V5 Test AND Rule',
      triggerType: 'SCREEN_TIME_LIMIT',
      conditionOperator: 'GREATER_THAN',
      thresholdValue: '1',
      actionType: 'SHOW_NOTIFICATION',
      actionTarget: 'Test',
      isEnabled: true,
      conditionLogic: 'ALL',
      conditions: {
        create: [
          { triggerType: 'SCREEN_TIME_LIMIT', conditionOperator: 'GREATER_THAN', thresholdValue: '1', orderIndex: 0 },
          { triggerType: 'REELS_LIMIT', conditionOperator: 'GREATER_THAN', thresholdValue: String(shortForm + 1000), orderIndex: 1 },
        ],
      },
    },
  });
  const andTest = await AutomationService.testRule(userId, andRule.id);
  assert(andTest.wouldTrigger === false, 'AND rule correctly does NOT trigger when one of two conditions fails');

  const andRulePassing = await prisma.automationRule.create({
    data: {
      userId,
      name: 'V5 Test AND Rule (both pass)',
      triggerType: 'SCREEN_TIME_LIMIT',
      conditionOperator: 'GREATER_THAN',
      thresholdValue: '1',
      actionType: 'SHOW_NOTIFICATION',
      actionTarget: 'Test',
      isEnabled: true,
      conditionLogic: 'ALL',
      conditions: {
        create: [
          { triggerType: 'SCREEN_TIME_LIMIT', conditionOperator: 'GREATER_THAN', thresholdValue: '1', orderIndex: 0 },
          { triggerType: 'REELS_LIMIT', conditionOperator: 'GREATER_THAN', thresholdValue: '1', orderIndex: 1 },
        ],
      },
    },
  });
  const andTestPass = await AutomationService.testRule(userId, andRulePassing.id);
  assert(andTestPass.wouldTrigger === true, 'AND rule correctly triggers when all conditions pass');

  // OR/GROUPED rule: one condition definitely fails, one definitely passes —
  // OR-group should still evaluate true.
  //
  // NOTE / discovered bug: AutomationService.createRule's nested Prisma write
  // (rule -> conditionGroups.create -> conditions.create) fails at runtime
  // with "Argument `rule` is missing" — verified independently via a raw
  // POST /automation/rules call with a conditionGroups payload, which returns
  // HTTP 400 with that exact Prisma error. AutomationCondition.ruleId is a
  // required (non-nullable) scalar field, but a two-level-deep nested create
  // only wires the immediate parent relation (groupId), never the
  // grandparent's ruleId — so any GROUPED rule created through the real
  // createRule()/POST /automation/rules path with conditions inside
  // conditionGroups is currently broken. This is a genuine product bug, out
  // of scope for this test-only task to fix, but worth flagging. To still
  // exercise evaluateGroupTree/evaluateGroupedRule's OR logic, this test
  // builds the same row shape directly via Prisma (setting both ruleId AND
  // groupId on each AutomationCondition), bypassing the broken nested-create.
  const orRule = await prisma.automationRule.create({
    data: {
      userId,
      name: 'V5 Test OR/GROUPED Rule',
      triggerType: 'SCREEN_TIME_LIMIT',
      conditionOperator: 'GREATER_THAN',
      thresholdValue: '1',
      actionType: 'SHOW_NOTIFICATION',
      actionTarget: 'Test',
      isEnabled: true,
      conditionLogic: 'GROUPED',
    },
  });
  const orGroup = await prisma.automationConditionGroup.create({
    data: { ruleId: orRule.id, logic: 'OR', orderIndex: 0 },
  });
  await prisma.automationCondition.createMany({
    data: [
      {
        ruleId: orRule.id,
        groupId: orGroup.id,
        triggerType: 'SCREEN_TIME_LIMIT',
        conditionOperator: 'GREATER_THAN',
        thresholdValue: String(screenTime + 1000),
        orderIndex: 0,
      },
      {
        ruleId: orRule.id,
        groupId: orGroup.id,
        triggerType: 'REELS_LIMIT',
        conditionOperator: 'GREATER_THAN',
        thresholdValue: '1',
        orderIndex: 1,
      },
    ],
  });
  const orTest = await AutomationService.testRule(userId, orRule.id);
  assert(orTest.wouldTrigger === true, 'OR/GROUPED rule triggers when at least one branch condition passes');

  // Dry-run must never write an AutomationLog.
  const logCountBefore = await prisma.automationLog.count({ where: { userId } });
  await AutomationService.testRule(userId, andRulePassing.id);
  await AutomationService.testRule(userId, orRule.id);
  const logCountAfterDryRun = await prisma.automationLog.count({ where: { userId } });
  assert(logCountBefore === logCountAfterDryRun, 'Dry-run testRule never writes an AutomationLog');

  // Also confirm via real HTTP dry-run endpoint.
  const httpTestRes = await fetch(`${BASE_URL}/automation/rules/${andRulePassing.id}/test`, { method: 'POST', headers });
  const httpTestJson: any = await json(httpTestRes);
  const logCountAfterHttpDryRun = await prisma.automationLog.count({ where: { userId } });
  assert(
    httpTestRes.status === 200 && httpTestJson?.wouldTrigger === true && logCountAfterHttpDryRun === logCountBefore,
    'POST /automation/rules/:id/test (HTTP dry-run) also triggers correctly without writing AutomationLog'
  );

  // Cooldown: create a SINGLE rule with a threshold currently true and a
  // 60-minute cooldown. First evaluateRules() call should trigger and log;
  // an immediate second call must be blocked (cooldownActive), regardless of
  // the pre-existing 4h anti-spam gate — evaluated directly via the service
  // (not HTTP) since this is the cleanest way to exercise the exact code
  // path in evaluateRules that applies cooldownMinutes.
  const cooldownRule = await prisma.automationRule.create({
    data: {
      userId,
      name: 'V5 Test Cooldown Rule',
      triggerType: 'SCREEN_TIME_LIMIT',
      conditionOperator: 'GREATER_THAN',
      thresholdValue: '1',
      actionType: 'SHOW_NOTIFICATION',
      actionTarget: 'Test',
      isEnabled: true,
      conditionLogic: 'SINGLE',
      cooldownMinutes: 60,
      lastTriggeredAt: null,
    },
  });
  const firstEval = await AutomationService.evaluateRules(userId);
  const ruleAfterFirst = await prisma.automationRule.findUnique({ where: { id: cooldownRule.id } });
  assert(firstEval.triggered >= 1 && !!ruleAfterFirst?.lastTriggeredAt, 'First evaluateRules() call triggers the cooldown-configured rule');

  const logCountAfterFirstEval = await prisma.automationLog.count({ where: { userId, ruleId: cooldownRule.id } });
  const secondEval = await AutomationService.evaluateRules(userId);
  const logCountAfterSecondEval = await prisma.automationLog.count({ where: { userId, ruleId: cooldownRule.id } });
  assert(
    logCountAfterFirstEval === 1 && logCountAfterSecondEval === 1,
    'Cooldown blocks a second live trigger of the same rule within the cooldown window (no duplicate AutomationLog)'
  );

  // ==========================================================
  // 8. AI COPILOT
  // ==========================================================
  console.log('\n[8/8] Testing AI Copilot intent routing & grounding...');

  const phrasings = [
    { query: 'this week vs last week', label: 'compare-week' },
    { query: 'what was my biggest distraction session', label: 'biggest-distraction' },
    { query: 'how much coding time this month', label: 'coding-time-this-month' },
    { query: 'what are my most-used websites', label: 'most-used-websites' },
    { query: 'what was unusual yesterday', label: 'unusual-yesterday' },
  ];

  for (const { query, label } of phrasings) {
    const res = await fetch(`${BASE_URL}/v3/assistant/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: query }),
    });
    const body: any = await json(res);
    const hasGrounding =
      body &&
      typeof body.answer === 'string' &&
      Array.isArray(body.evidence) &&
      body.dateRangeConsidered &&
      Array.isArray(body.devicesConsidered) &&
      typeof body.dataAvailable === 'boolean';
    assert(res.status === 200 && hasGrounding, `AI copilot phrasing "${label}" ("${query}") responds with full grounding fields`);
  }

  // A query about clearly-nonexistent data should honestly report dataAvailable:false.
  const nonexistentRes = await fetch(`${BASE_URL}/v3/assistant/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content: 'how much time did I spend on TikTok yesterday' }),
  });
  const nonexistentJson: any = await json(nonexistentRes);
  assert(
    nonexistentRes.status === 200 && nonexistentJson?.dataAvailable === false,
    'AI copilot reports dataAvailable:false for a query about data that does not exist (TikTok yesterday, unseeded)'
  );

  console.log(`\n==============================================`);
  console.log(`🎯 Version 5.1 Test Suite Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runV5Tests()
  .catch((err) => {
    console.error('Fatal test failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
