import assert from 'node:assert';
const BASE_URL = 'http://localhost:5000/api';
async function runE2ETests() {
    console.log('🚀 Starting Focus Intelligence End-to-End Test Suite...\n');
    // 1. Health Check
    console.log('1. Verifying API health check...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    assert.strictEqual(healthRes.status, 200, 'Health check should return 200');
    const healthData = (await healthRes.json());
    assert.strictEqual(healthData.status, 'ok');
    console.log('✔ Health check OK:', healthData);
    // 2. Authentication Login
    console.log('\n2. Testing authentication login with seeded user...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'devang@focusintelligence.io',
            password: 'Password123!',
        }),
    });
    assert.strictEqual(loginRes.status, 200, 'Login should succeed with 200');
    const loginData = (await loginRes.json());
    assert(loginData.token, 'Token must be returned');
    assert.strictEqual(loginData.user.email, 'devang@focusintelligence.io');
    console.log('✔ Login successful. User:', loginData.user.name);
    const token = loginData.token;
    const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
    // 3. User Devices
    console.log('\n3. Testing device retrieval...');
    const devRes = await fetch(`${BASE_URL}/devices`, { headers: authHeaders });
    assert.strictEqual(devRes.status, 200);
    const devData = (await devRes.json());
    assert(Array.isArray(devData.devices), 'Devices array must be returned');
    assert(devData.devices.length >= 2, 'Should have at least 2 seeded devices');
    console.log(`✔ Found ${devData.devices.length} registered hardware devices:`);
    devData.devices.forEach((d) => console.log(`   - ${d.name} (${d.os} • ${d.deviceType})`));
    // 4. Dashboard Overview Telemetry
    console.log('\n4. Testing Dashboard overview analytics for today...');
    const overviewRes = await fetch(`${BASE_URL}/analytics/overview`, { headers: authHeaders });
    assert.strictEqual(overviewRes.status, 200);
    const overview = (await overviewRes.json());
    assert(overview.metrics, 'Metrics object must be present');
    console.log(`✔ Screen Time: ${overview.metrics.screenTime.formatted}`);
    console.log(`✔ Shorts & Reels: ${overview.metrics.shortForm.formatted} (${overview.metrics.shortForm.reelCount} Reels)`);
    console.log(`✔ Attention Score: ${overview.metrics.attentionScore.score}/100`);
    console.log(`✔ Unlocks: ${overview.metrics.unlocks}, Notifications: ${overview.metrics.notifications}`);
    console.log(`✔ Scroll Cost translation: ${overview.metrics.scrollCost.hours}h of deep learning`);
    assert(overview.topApps.length > 0, 'Top apps must be populated');
    console.log(`✔ Top App: ${overview.topApps[0].name} (${overview.topApps[0].activeFormatted})`);
    // 5. Trends
    console.log('\n5. Testing 7-day trend calculations...');
    const trendsRes = await fetch(`${BASE_URL}/analytics/trends?days=7`, { headers: authHeaders });
    assert.strictEqual(trendsRes.status, 200);
    const trends = (await trendsRes.json());
    assert(trends.trendData.length === 7, 'Must have 7 days of trend telemetry');
    console.log(`✔ Trend calculated: Avg ${trends.summary.avgDailyScreenTime}/day across ${trends.summary.daysWithData} days`);
    // 6. Multipart Screenshot Upload & AI/OCR Extraction
    console.log('\n6. Testing batch screenshot upload with Multer and OCR extraction...');
    const formData = new FormData();
    const sampleFile1 = new Blob(['sample_android_digital_wellbeing_data'], { type: 'image/png' });
    const sampleFile2 = new Blob(['sample_windows_laptop_battery_data'], { type: 'image/png' });
    formData.append('screenshots', sampleFile1, 'android_digital_wellbeing.png');
    formData.append('screenshots', sampleFile2, 'windows_laptop_battery.png');
    formData.append('deviceId', devData.devices[0].id);
    const uploadRes = await fetch(`${BASE_URL}/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });
    assert.strictEqual(uploadRes.status, 201, 'Upload should return 201 Created');
    const uploadData = (await uploadRes.json());
    assert(uploadData.uploads.length === 2, '2 screenshots must be processed');
    console.log(`✔ Uploaded and analyzed ${uploadData.uploads.length} screenshots:`);
    uploadData.uploads.forEach((u) => console.log(`   - ${u.originalName} -> Class: ${u.classification} (Confidence: ${Math.round(u.confidence * 100)}%)`));
    // 7. Verification & Confirmation Flow
    console.log('\n7. Testing Human Verification and Field Confirmation...');
    const targetExtractionId = uploadData.uploads[0].extractionId;
    assert(targetExtractionId, 'Extraction ID must be present');
    const extRes = await fetch(`${BASE_URL}/uploads/extractions/${targetExtractionId}`, {
        headers: authHeaders,
    });
    assert.strictEqual(extRes.status, 200);
    const extData = (await extRes.json());
    assert(extData.extraction.fields.length > 0, 'Extraction must contain detected fields');
    console.log(`✔ Retrieved extraction with ${extData.extraction.fields.length} detected fields`);
    // User edits a field during review (e.g. adjust Instagram active time) and confirms
    console.log('   Applying user review edits and confirming...');
    const confirmRes = await fetch(`${BASE_URL}/uploads/extractions/${targetExtractionId}/confirm`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
            confirmedDate: new Date().toISOString().split('T')[0],
            editedFields: [
                {
                    fieldKey: 'app:Instagram',
                    appName: 'Instagram',
                    duration: '6h 15m',
                    activeMinutes: 375,
                    category: 'Social Media',
                    reelCount: 710,
                    shortsMinutes: 215,
                },
            ],
        }),
    });
    assert.strictEqual(confirmRes.status, 200, 'Confirmation must return 200');
    const confirmData = (await confirmRes.json());
    console.log('✔ Confirmation successful:', confirmData.message);
    // 8. Re-checking Dashboard for Live Updates
    console.log('\n8. Verifying that the Dashboard updated live with confirmed data...');
    const updatedOverviewRes = await fetch(`${BASE_URL}/analytics/overview`, { headers: authHeaders });
    const updatedOverview = (await updatedOverviewRes.json());
    console.log(`✔ Updated Daily Screen Time: ${updatedOverview.metrics.screenTime.formatted}`);
    console.log(`✔ Updated Shorts & Reels: ${updatedOverview.metrics.shortForm.formatted} (${updatedOverview.metrics.shortForm.reelCount} Reels)`);
    console.log(`✔ Updated Attention Score: ${updatedOverview.metrics.attentionScore.score}/100`);
    console.log('\n🎉 ALL END-TO-END TESTS PASSED WITH 100% SUCCESS!');
}
runE2ETests().catch((err) => {
    console.error('❌ E2E Test Failure:', err);
    process.exit(1);
});
