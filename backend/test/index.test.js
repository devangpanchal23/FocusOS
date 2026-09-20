import assert from 'node:assert';
import { parseDurationToMinutes, formatMinutes, calculateAttentionScore, calculateScrollCost, } from '../src/utils/durationParser.js';
console.log('Running Focus Intelligence Unit Tests...');
// 1. Duration parser tests
assert.strictEqual(parseDurationToMinutes('6h 08m'), 368, '6h 08m should be 368 minutes');
assert.strictEqual(parseDurationToMinutes('1h 31m'), 91, '1h 31m should be 91 minutes');
assert.strictEqual(parseDurationToMinutes('21m'), 21, '21m should be 21 minutes');
assert.strictEqual(parseDurationToMinutes('2h'), 120, '2h should be 120 minutes');
assert.strictEqual(parseDurationToMinutes('06:08'), 368, '06:08 should be 368 minutes');
assert.strictEqual(parseDurationToMinutes(''), 0, 'empty string should be 0');
console.log('✔ Duration parser tests passed');
// 2. Format minutes tests
assert.strictEqual(formatMinutes(368), '6h 08m', '368m should format to 6h 08m');
assert.strictEqual(formatMinutes(21), '21m', '21m should format to 21m');
assert.strictEqual(formatMinutes(0), '0m', '0 should format to 0m');
console.log('✔ Format minutes tests passed');
// 3. Attention score calculation tests
const scoreResult = calculateAttentionScore({
    totalScreenTimeMinutes: 468, // 7h 48m
    productiveMinutes: 192,
    shortFormMinutes: 205, // 3h 25m
    dailyTargetMinutes: 240,
    unlocks: 75,
    notifications: 532,
});
assert(scoreResult.score >= 0 && scoreResult.score <= 100, 'Score must be between 0 and 100');
assert(scoreResult.factors.length > 0, 'Score must include transparent breakdown factors');
console.log(`✔ Attention score test passed (Score: ${scoreResult.score}, Factors: ${scoreResult.factors.length})`);
// 4. Scroll cost tests
const scrollCost = calculateScrollCost(205); // 3h 25m
assert.strictEqual(scrollCost.hours, 3.4, '205 minutes should equal ~3.4 hours');
assert(scrollCost.equivalents.length >= 4, 'Scroll cost should provide 4 practical equivalents');
console.log(`✔ Scroll cost test passed (${scrollCost.hours}h converted to equivalents)`);
console.log('All backend unit tests passed successfully! 🎉');
