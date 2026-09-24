import { prisma } from '../src/config/db.js';

// Real-HTTP security/isolation suite for the V5.1 surface, matching the style
// of test/full_system.test.ts and test/v5.test.ts. Requires the backend to
// already be running (see v5.test.ts header comment).
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

async function runSecurityTests() {
  console.log('🔒 Starting FocusOS Version 5.1 Security & Isolation Test Suite...\n');

  // --- User A: the real seeded account ---
  const loginA = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'devang@focusintelligence.io', password: 'Password123!' }),
  });
  const loginAJson: any = await json(loginA);
  assert(loginA.status === 200 && !!loginAJson?.token, 'User A (seeded account) logs in successfully');
  const tokenA = loginAJson.token;
  const headersA = { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' };
  const userAId = loginAJson.user.id;

  // --- User B: a fresh throwaway user created via the real register endpoint ---
  const uniqueEmail = `v5-security-test-${Date.now()}@focusintelligence.io`;
  const registerB = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, password: 'ThrowawayPass123!', name: 'V5 Security Test User B' }),
  });
  const registerBJson: any = await json(registerB);
  assert(registerB.status === 201 && !!registerBJson?.token, 'User B (throwaway account) registers successfully via real endpoint');
  const tokenB = registerBJson.token;
  const headersB = { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' };
  const userBId = registerBJson.user.id;

  // Give User B a uniquely-identifiable secret automation rule + browser
  // session so we can assert User A never sees it.
  const secretMarker = `SECRET-MARKER-${Date.now()}`;
  const secretRuleRes = await fetch(`${BASE_URL}/automation/rules`, {
    method: 'POST',
    headers: headersB,
    body: JSON.stringify({
      name: secretMarker,
      triggerType: 'SCREEN_TIME_LIMIT',
      conditionOperator: 'GREATER_THAN',
      thresholdValue: '999',
      actionType: 'SHOW_NOTIFICATION',
      actionTarget: 'Test',
    }),
  });
  const secretRuleJson: any = await json(secretRuleRes);
  assert(secretRuleRes.status === 201 && !!secretRuleJson?.id, "User B's secret automation rule is created");
  const secretDomain = `secret-domain-${Date.now()}.example`;
  await fetch(`${BASE_URL}/v5/browser/sessions`, {
    method: 'POST',
    headers: headersB,
    body: JSON.stringify({
      sessions: [{ domain: secretDomain, startedAt: new Date().toISOString(), durationSeconds: 120, title: secretMarker }],
    }),
  });

  // ==========================================================
  // 1. CROSS-USER DATA ISOLATION
  // ==========================================================
  console.log('\n[1/5] Testing cross-user data isolation...');

  const rulesAsA = await fetch(`${BASE_URL}/automation/rules`, { headers: headersA });
  const rulesAsAJson: any = await json(rulesAsA);
  const aSeesSecretRule = Array.isArray(rulesAsAJson) && rulesAsAJson.some((r: any) => r.name === secretMarker || r.id === secretRuleJson.id);
  assert(rulesAsA.status === 200 && !aSeesSecretRule, "User A's automation rules list never contains User B's secret rule");

  const domainsAsA = await fetch(`${BASE_URL}/v5/browser/domains`, { headers: headersA });
  const domainsAsAJson: any = await json(domainsAsA);
  const aSeesSecretDomain = domainsAsAJson?.domains?.some((d: any) => d.domain === secretDomain);
  assert(domainsAsA.status === 200 && !aSeesSecretDomain, "User A's browser domain analytics never contains User B's secret domain");

  const timelineAsA = await fetch(`${BASE_URL}/v5/timeline?search=${encodeURIComponent(secretMarker)}`, { headers: headersA });
  const timelineAsAJson: any = await json(timelineAsA);
  assert(
    timelineAsA.status === 200 && (timelineAsAJson?.events?.length ?? 0) === 0,
    "User A's timeline search for User B's secret marker returns zero events (no leak)"
  );

  // Direct ID-based lookup: can User A read/delete User B's specific rule by ID?
  const directGetB = await fetch(`${BASE_URL}/automation/rules/${secretRuleJson.id}/test`, { method: 'POST', headers: headersA });
  const directGetBJson: any = await json(directGetB);
  assert(
    directGetB.status === 404 || directGetB.status === 403 || directGetBJson?.explanation === 'Rule not found.',
    "User A cannot dry-run-test User B's rule by ID (not found / forbidden, never evaluated)"
  );

  const directDeleteB = await fetch(`${BASE_URL}/automation/rules/${secretRuleJson.id}`, { method: 'DELETE', headers: headersA });
  await directDeleteB.text().catch(() => {});
  const ruleStillExists = await prisma.automationRule.findUnique({ where: { id: secretRuleJson.id } });
  assert(!!ruleStillExists, "User A's DELETE request against User B's rule ID does not actually delete it");

  // Data sources listing isolation.
  const dataSourcesAsA = await fetch(`${BASE_URL}/v5/data-sources`, { headers: headersA });
  const dataSourcesAsAJson: any = await json(dataSourcesAsA);
  const bDataSources = await prisma.dataSource.findMany({ where: { userId: userBId } });
  const bDsIds = new Set(bDataSources.map((d) => d.id));
  const leaksBDataSource = Array.isArray(dataSourcesAsAJson)
    ? dataSourcesAsAJson.some((d: any) => bDsIds.has(d.id))
    : Array.isArray(dataSourcesAsAJson?.dataSources) && dataSourcesAsAJson.dataSources.some((d: any) => bDsIds.has(d.id));
  assert(dataSourcesAsA.status === 200 && !leaksBDataSource, "User A's data-sources list never contains User B's DataSource rows");

  // ==========================================================
  // 2. AUTH REJECTION (missing/invalid JWT)
  // ==========================================================
  console.log('\n[2/5] Testing missing/invalid/malformed JWT rejection...');

  const protectedRoutes = [
    { method: 'GET', path: '/v5/timeline' },
    { method: 'GET', path: '/automation/rules' },
    { method: 'GET', path: '/v5/browser/domains' },
    { method: 'GET', path: '/v5/data-sources' },
    { method: 'GET', path: '/v5/time-intelligence/summary' },
  ];

  for (const route of protectedRoutes) {
    const noAuthRes = await fetch(`${BASE_URL}${route.path}`, { method: route.method });
    assert(noAuthRes.status === 401, `${route.method} ${route.path} rejects a request with no Authorization header (401)`);

    const badAuthRes = await fetch(`${BASE_URL}${route.path}`, {
      method: route.method,
      headers: { Authorization: 'Bearer not.a.valid.jwt.at.all' },
    });
    assert(badAuthRes.status === 401, `${route.method} ${route.path} rejects a malformed/garbage JWT (401)`);

    // Expired-shaped JWT: syntactically a JWT (3 base64 segments) signed with
    // the wrong secret, so verification fails identically to an expired one
    // from this server's perspective (it cannot distinguish "expired" from
    // "invalid signature" without the real secret, and this test intentionally
    // never uses the real backend JWT_SECRET).
    const fakeExpiredJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlIiwiZXhwIjoxfQ.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const expiredRes = await fetch(`${BASE_URL}${route.path}`, {
      method: route.method,
      headers: { Authorization: `Bearer ${fakeExpiredJwt}` },
    });
    assert(expiredRes.status === 401, `${route.method} ${route.path} rejects an expired-shaped/invalid-signature JWT (401)`);
  }

  // ==========================================================
  // 3. SYNC-TOKEN REJECTION
  // ==========================================================
  console.log('\n[3/5] Testing wrong/garbage X-Sync-Token rejection...');

  const desktopSyncBadToken = await fetch(`${BASE_URL}/v5/desktop/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Sync-Token': 'totally-garbage-token-value' },
    body: JSON.stringify({ events: [] }),
  });
  assert(desktopSyncBadToken.status === 401, 'POST /v5/desktop/sync rejects a garbage X-Sync-Token (401)');

  const mobileSyncBadToken = await fetch(`${BASE_URL}/v5/mobile/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Sync-Token': 'totally-garbage-token-value' },
    body: JSON.stringify({ events: [] }),
  });
  assert(mobileSyncBadToken.status === 401, 'POST /v5/mobile/sync rejects a garbage X-Sync-Token (401)');

  const desktopSyncNoToken = await fetch(`${BASE_URL}/v5/desktop/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: [] }),
  });
  assert(desktopSyncNoToken.status === 401, 'POST /v5/desktop/sync rejects a request with no X-Sync-Token header at all (401)');

  // Cross-user: User B's syncToken must not authenticate as User A, and vice
  // versa is implicitly covered since tokens are unique per DataSource.
  const regB = await fetch(`${BASE_URL}/v5/desktop/register`, {
    method: 'POST',
    headers: headersB,
    body: JSON.stringify({ name: 'User B Desktop', os: 'LINUX' }),
  });
  const regBJson: any = await json(regB);
  const syncAsBToken = regBJson.syncToken;

  const crossUserSync = await fetch(`${BASE_URL}/v5/desktop/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Sync-Token': syncAsBToken },
    body: JSON.stringify({ events: [{ occurredAt: new Date().toISOString(), durationSeconds: 30, appName: 'CrossUserProbe' }] }),
  });
  await crossUserSync.text().catch(() => {});
  const crossUserEvent = await prisma.unifiedEvent.findFirst({ where: { userId: userAId, title: 'CrossUserProbe' } });
  assert(!crossUserEvent, "User B's syncToken never attributes ingested events to User A");

  // ==========================================================
  // 4. INJECTION-STYLE INPUT HANDLING
  // ==========================================================
  console.log('\n[4/5] Testing injection-style input handling on timeline search/filter...');

  const injectionPayloads = [`' OR '1'='1`, `<script>alert(1)</script>`, `"; DROP TABLE UnifiedEvent; --`];
  for (const payload of injectionPayloads) {
    const res = await fetch(`${BASE_URL}/v5/timeline?search=${encodeURIComponent(payload)}`, { headers: headersA });
    const body: any = await json(res);
    assert(res.status === 200 && Array.isArray(body?.events), `Injection-style search payload "${payload.slice(0, 20)}..." does not error the server (200, clean array)`);
  }

  const injectionFilterRes = await fetch(
    `${BASE_URL}/v5/timeline?deviceIds=${encodeURIComponent(`' OR '1'='1`)}&categoryIds=${encodeURIComponent(`<script>`)}`,
    { headers: headersA }
  );
  const injectionFilterJson: any = await json(injectionFilterRes);
  assert(
    injectionFilterRes.status === 200 && Array.isArray(injectionFilterJson?.events) && injectionFilterJson.events.length === 0,
    'Injection-style filter param values produce a clean empty result, never a 500'
  );

  // Verify the table genuinely still exists / wasn't dropped by the DROP TABLE payload.
  const stillQueryable = await prisma.unifiedEvent.count({ where: { userId: userAId } });
  assert(typeof stillQueryable === 'number', 'UnifiedEvent table is still queryable after injection-style payloads (Prisma parameterizes correctly)');

  // ==========================================================
  // 5. AI COPILOT CROSS-USER LEAKAGE
  // ==========================================================
  console.log('\n[5/5] Testing AI Copilot never leaks another user\'s data...');

  // User B has data on a domain/app User A has never touched. Ask User A's
  // copilot about it by name and confirm the secret marker string never
  // appears anywhere in the response.
  const aiRes = await fetch(`${BASE_URL}/v3/assistant/chat`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ content: `what do you know about ${secretDomain}` }),
  });
  const aiJson: any = await json(aiRes);
  const responseText = JSON.stringify(aiJson);
  assert(
    aiRes.status === 200 && !responseText.includes(secretMarker) && !responseText.includes(secretDomain),
    "AI copilot response for User A never contains User B's secret marker or secret domain string"
  );

  // Ask User A's copilot about "most-used websites" (would surface domain
  // analytics if it were reading cross-user data instead of scoping by userId).
  const aiWebsitesRes = await fetch(`${BASE_URL}/v3/assistant/chat`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ content: 'what are my most-used websites' }),
  });
  const aiWebsitesJson: any = await json(aiWebsitesRes);
  const websitesResponseText = JSON.stringify(aiWebsitesJson);
  assert(
    aiWebsitesRes.status === 200 && !websitesResponseText.includes(secretDomain),
    "AI copilot 'most-used websites' answer for User A never includes User B's secret domain"
  );

  console.log(`\n==============================================`);
  console.log(`🔒 Version 5.1 Security Test Suite Finished: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests()
  .catch((err) => {
    console.error('Fatal test failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
