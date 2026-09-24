/**
 * Performance benchmark suite for V5 UnifiedEvent query paths.
 *
 * Runs against the THROWAWAY backend/prisma/perf-test.db ONLY. Never touches
 * backend/prisma/dev.db.
 *
 * IMPORTANT — why overriding process.env.DATABASE_URL here is safe:
 * timeline.service.ts and browserIntelligence.service.ts both import the
 * shared `prisma` singleton from `src/config/db.ts`, which is constructed as
 * `new PrismaClient()` with NO explicit datasource override — it relies on
 * the ambient DATABASE_URL. This script runs as its own, separate, one-shot
 * `tsx` process (via `tsx prisma/scripts/perfBenchmark.ts`); it is never the
 * long-running dev server process, and setting process.env.DATABASE_URL here
 * only affects this process's own environment, not the real backend server
 * or dev.db. We set it at the very top of the file, before importing any
 * module that transitively imports config/db.ts, so the singleton connects
 * to perf-test.db from the moment it's constructed. This lets us call the
 * REAL service functions (TimelineService.getTimeline, .getDaySummary,
 * BrowserIntelligenceService.getDomainAnalytics) unmodified, which is far
 * more representative than reimplementing their query logic by hand.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERF_DB_PATH = path.resolve(__dirname, '../perf-test.db');

// Must happen before importing anything that imports config/db.ts.
process.env.DATABASE_URL = `file:${PERF_DB_PATH}`;

const { PrismaClient } = await import('@prisma/client');
const { TimelineService } = await import('../../src/services/v5/timeline.service.js');
const { BrowserIntelligenceService } = await import('../../src/services/v5/browserIntelligence.service.js');

// Separate, explicit-url client for bookkeeping (row counts, user lookup,
// the raw dashboard-aggregate query) — kept independent of the singleton the
// services use, though both point at the same perf-test.db in this process.
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${PERF_DB_PATH}` } },
});

const RUNS = 5;

async function timeIt<T>(fn: () => Promise<T>, runs = RUNS): Promise<{ minMs: number; avgMs: number; maxMs: number; result: T }> {
  const timings: number[] = [];
  let result: T = undefined as any;
  for (let i = 0; i < runs; i++) {
    const start = Date.now();
    result = await fn();
    timings.push(Date.now() - start);
  }
  const minMs = Math.min(...timings);
  const maxMs = Math.max(...timings);
  const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length;
  return { minMs, avgMs, maxMs, result };
}

function fmt(stat: { minMs: number; avgMs: number; maxMs: number }): string {
  return `min=${stat.minMs}ms avg=${stat.avgMs.toFixed(1)}ms max=${stat.maxMs}ms`;
}

async function main() {
  const rowCount = await prisma.unifiedEvent.count();
  console.log(`\n=== Benchmarking against perf-test.db (${PERF_DB_PATH}) ===`);
  console.log(`UnifiedEvent row count: ${rowCount}`);

  const users = await prisma.user.findMany({ where: { email: { startsWith: 'perf-user-' } }, take: 1 });
  if (users.length === 0) {
    throw new Error('No perf-user-* seed users found. Run perfSeed.ts first.');
  }
  const userId = users[0].id;

  // Pick a real category id and device id present in the data so
  // filtered/search benchmarks exercise realistic, non-degenerate filters.
  const sampleCategory = await prisma.category.findFirst({ where: { name: 'Development' } });
  const sampleDevice = await prisma.device.findFirst({ where: { userId } });

  // Date range covering the full synthetic spread (~400 days back from today).
  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 400);
  const from = fromDate.toISOString().slice(0, 10);

  // Narrower 30-day window, typical for a "recent activity" dashboard view.
  const recentFromDate = new Date();
  recentFromDate.setDate(recentFromDate.getDate() - 30);
  const recentFrom = recentFromDate.toISOString().slice(0, 10);

  const results: Record<string, any> = { rowCount };

  // 1. getTimeline — plain keyset pagination, first page, no filters/search.
  const plainTimeline = await timeIt(() =>
    TimelineService.getTimeline(userId, { from, to, limit: 100 })
  );
  console.log(`\n[1] getTimeline (no filters/search): ${fmt(plainTimeline)}`);
  results.getTimelinePlain = { minMs: plainTimeline.minMs, avgMs: plainTimeline.avgMs, maxMs: plainTimeline.maxMs };

  // 2. getTimeline — with search + filters (device + category filter, plus
  // a text search term that hits application/domain/title via LIKE).
  const filteredTimeline = await timeIt(() =>
    TimelineService.getTimeline(userId, {
      from,
      to,
      limit: 100,
      deviceIds: sampleDevice ? [sampleDevice.id] : undefined,
      categoryIds: sampleCategory ? [sampleCategory.id] : undefined,
      search: 'code',
    })
  );
  console.log(`[2] getTimeline (search + device/category filters): ${fmt(filteredTimeline)}`);
  results.getTimelineFiltered = { minMs: filteredTimeline.minMs, avgMs: filteredTimeline.avgMs, maxMs: filteredTimeline.maxMs };

  // 3. getDaySummary — 24-hourly-bucket aggregation for a single day. Pick a
  // date guaranteed to have data (today minus a random offset within spread).
  const summaryDate = new Date();
  summaryDate.setDate(summaryDate.getDate() - 15);
  const dateStr = summaryDate.toISOString().slice(0, 10);
  const daySummary = await timeIt(() => TimelineService.getDaySummary(userId, dateStr));
  console.log(`[3] getDaySummary (date=${dateStr}): ${fmt(daySummary)}`);
  results.getDaySummary = { minMs: daySummary.minMs, avgMs: daySummary.avgMs, maxMs: daySummary.maxMs };

  // 4. getDomainAnalytics — browser domain aggregation over the full range.
  const domainAnalytics = await timeIt(() =>
    BrowserIntelligenceService.getDomainAnalytics(userId, from, to)
  );
  console.log(`[4] getDomainAnalytics: ${fmt(domainAnalytics)}`);
  results.getDomainAnalytics = { minMs: domainAnalytics.minMs, avgMs: domainAnalytics.avgMs, maxMs: domainAnalytics.maxMs };

  // 5. Dashboard-style aggregate: total duration + event count grouped by
  // category over a recent 30-day rolling window, mimicking a dashboard
  // "time by category" widget. Raw Prisma groupBy (no single existing
  // service function matches this shape exactly).
  const dashboardAggregate = await timeIt(() =>
    prisma.unifiedEvent.groupBy({
      by: ['categoryId'],
      where: { userId, date: { gte: recentFrom, lte: to } },
      _sum: { durationSeconds: true },
      _count: { _all: true },
    })
  );
  console.log(`[5] dashboard groupBy (category totals, last 30d): ${fmt(dashboardAggregate)}`);
  results.dashboardGroupBy = { minMs: dashboardAggregate.minMs, avgMs: dashboardAggregate.avgMs, maxMs: dashboardAggregate.maxMs };

  console.log('\n=== Summary (JSON) ===');
  console.log(JSON.stringify(results, null, 2));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
