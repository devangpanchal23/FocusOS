import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';

async function runV2Tests() {
  console.log('🚀 Starting FocusOS Version 2 Test Suite...\n');

  // 1. Auth Login
  console.log('1. Authenticating test session...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'devang@focusintelligence.io',
      password: 'Password123!',
    }),
  });
  assert.strictEqual(loginRes.status, 200);
  const { token } = (await loginRes.json()) as any;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  console.log('✔ Authenticated successfully.');

  // 2. Behavioral Insights Engine
  console.log('\n2. Testing Insights Engine (/api/insights)...');
  const insightsRes = await fetch(`${BASE_URL}/insights`, { headers });
  assert.strictEqual(insightsRes.status, 200);
  const insights = (await insightsRes.json()) as any[];
  assert(Array.isArray(insights), 'Insights should be an array');
  console.log(`✔ Received ${insights.length} dynamic insights.`);
  insights.forEach((ins) => console.log(`   [${ins.type}] ${ins.title}: ${ins.description}`));

  // 3. Focus Studio Profiles & Sessions
  console.log('\n3. Testing Focus Studio (/api/focus)...');
  const profilesRes = await fetch(`${BASE_URL}/focus/profiles`, { headers });
  assert.strictEqual(profilesRes.status, 200);
  const profiles = (await profilesRes.json()) as any[];
  assert(profiles.length > 0, 'Profiles should exist');
  console.log(`✔ Found ${profiles.length} focus profiles (e.g. "${profiles[0].name}")`);

  console.log('   Starting a new focus session...');
  const sessionRes = await fetch(`${BASE_URL}/focus/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      profileId: profiles[0].id,
      taskName: 'Building FocusOS V2 Studio',
      durationMinutes: 25,
    }),
  });
  assert.strictEqual(sessionRes.status, 201);
  const session = (await sessionRes.json()) as any;
  assert(session.id, 'Session ID required');
  console.log(`✔ Session started: "${session.taskName}" (${session.durationMinutes}m)`);

  console.log('   Recording a distraction interruption...');
  const distractRes = await fetch(`${BASE_URL}/focus/sessions/${session.id}/distraction`, {
    method: 'POST',
    headers,
  });
  assert.strictEqual(distractRes.status, 200);

  console.log('   Completing focus session...');
  const completeRes = await fetch(`${BASE_URL}/focus/sessions/${session.id}/complete`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ completedMinutes: 25, notes: 'Completed seamlessly' }),
  });
  assert.strictEqual(completeRes.status, 200);
  const completeData = (await completeRes.json()) as any;
  console.log(`✔ Session completed! Earned ${completeData.xpEarned} XP.`);

  // 4. App & Site Blocking Rules & Intentional Overrides
  console.log('\n4. Testing App & Site Blocker (/api/blocking)...');
  const rulesRes = await fetch(`${BASE_URL}/blocking/rules`, { headers });
  assert.strictEqual(rulesRes.status, 200);
  const blockRules = (await rulesRes.json()) as any[];
  assert(blockRules.length > 0, 'Block rules should exist');
  const firstRule = blockRules[0];
  console.log(`✔ Found ${blockRules.length} block rules (e.g. ${firstRule.targetValue})`);

  console.log('   Testing intentional override submission...');
  const overrideRes = await fetch(`${BASE_URL}/blocking/rules/${firstRule.id}/override`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reason: 'Urgent customer support verification',
      overrideDurationMinutes: 15,
    }),
  });
  assert.strictEqual(overrideRes.status, 201);
  const overrideData = (await overrideRes.json()) as any;
  assert.strictEqual(overrideData.overrideDurationMinutes, 15);
  console.log(`✔ Intentional override logged with reason: "${overrideData.reason}"`);

  // 5. Routines Schedule
  console.log('\n5. Testing Daily/Weekly Routines (/api/routines)...');
  const routinesRes = await fetch(`${BASE_URL}/routines`, { headers });
  assert.strictEqual(routinesRes.status, 200);
  const routines = (await routinesRes.json()) as any[];
  assert(routines.length > 0, 'Routines should exist');
  console.log(`✔ Found ${routines.length} scheduled routines (e.g. "${routines[0].title}" ${routines[0].startTime}-${routines[0].endTime})`);

  // 6. Automation Rules & Evaluator
  console.log('\n6. Testing Smart Automations (/api/automation)...');
  const automationsRes = await fetch(`${BASE_URL}/automation/rules`, { headers });
  assert.strictEqual(automationsRes.status, 200);
  const automations = (await automationsRes.json()) as any[];
  assert(automations.length > 0, 'Automations should exist');
  console.log(`✔ Found ${automations.length} automation rules.`);

  console.log('   Evaluating active automations against telemetry...');
  const evalRes = await fetch(`${BASE_URL}/automation/evaluate`, { method: 'POST', headers });
  assert.strictEqual(evalRes.status, 200);
  const evalData = (await evalRes.json()) as any;
  console.log(`✔ Rules evaluated: ${evalData.evaluated} checked, ${evalData.triggered} triggered.`);

  // 7. Gamification & Achievements
  console.log('\n7. Testing Gamification & Streaks (/api/gamification)...');
  const gamificationRes = await fetch(`${BASE_URL}/gamification`, { headers });
  assert.strictEqual(gamificationRes.status, 200);
  const gamification = (await gamificationRes.json()) as any;
  assert(gamification.xp !== undefined, 'XP required');
  console.log(`✔ User Level: ${gamification.level} (${gamification.xp} XP), Streak: ${gamification.dailyStreak} days`);
  console.log(`✔ Achievements: ${gamification.achievements?.length || 0} registered`);

  // 8. Notification Center
  console.log('\n8. Testing Notification Center (/api/notifications)...');
  const notifsRes = await fetch(`${BASE_URL}/notifications`, { headers });
  assert.strictEqual(notifsRes.status, 200);
  const notifsData = (await notifsRes.json()) as any;
  console.log(`✔ Notifications in drawer: ${notifsData.notifications.length} (${notifsData.unreadCount} unread)`);

  // 9. Export Endpoints
  console.log('\n9. Testing Multi-Format Data Export (/api/export)...');
  const csvRes = await fetch(`${BASE_URL}/export/csv`, { headers });
  assert.strictEqual(csvRes.status, 200);
  const csvText = await csvRes.text();
  assert(csvText.includes('Date,Device,Application'), 'CSV header check');
  console.log(`✔ CSV Export OK (${csvText.length} bytes)`);

  const jsonRes = await fetch(`${BASE_URL}/export/json`, { headers });
  assert.strictEqual(jsonRes.status, 200);
  const jsonData = (await jsonRes.json()) as any;
  assert(jsonData.exportVersion === '2.0', 'JSON export version check');
  console.log(`✔ JSON Backup Export OK (${jsonData.dailyMetrics?.length} daily metrics, ${jsonData.usageRecords?.length} usage records)`);

  const digestRes = await fetch(`${BASE_URL}/export/digest`, { headers });
  assert.strictEqual(digestRes.status, 200);
  const digestHtml = await digestRes.text();
  assert(digestHtml.includes('FocusOS Executive Telemetry Digest'), 'HTML digest title check');
  console.log(`✔ HTML Printable Digest OK (${digestHtml.length} bytes)`);

  // 10. User Settings
  console.log('\n10. Testing Personalization & Settings (/api/settings)...');
  const settingsRes = await fetch(`${BASE_URL}/settings`, { headers });
  assert.strictEqual(settingsRes.status, 200);
  const settings = (await settingsRes.json()) as any;
  assert(settings.theme, 'Theme setting check');
  console.log(`✔ Settings retrieved: Theme=${settings.theme}, Default Focus=${settings.defaultFocusMinutes}m`);

  console.log('\n🎉 ALL 10 VERSION 2 MODULES VERIFIED SUCCESSFULLY!');
}

runV2Tests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
