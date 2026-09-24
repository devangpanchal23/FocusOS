# V5 UnifiedEvent Performance Benchmark Report

Generated 2026-09-24. All numbers in this report are **real measured timings**
from running the actual FocusOS backend service code against a throwaway
SQLite database (`backend/prisma/perf-test.db`), never against the real
`backend/prisma/dev.db`.

## Methodology

- **Database under test:** `backend/prisma/perf-test.db`, a separate SQLite
  file created via `DATABASE_URL="file:./perf-test.db" npx prisma db push --skip-generate`
  (schema push only — no migration history, no effect on `dev.db`).
- **Seeding:** `backend/prisma/scripts/perfSeed.ts` seeds minimal reference
  data (5 users, 15 devices, 8 categories, 18 applications) and then
  synthetic `UnifiedEvent` rows via batched `createMany` (8,000 rows/batch).
  Timestamps are randomized across a ~400-day window, with randomized
  device/category/application/domain/sourceType/eventType combinations, so
  index range scans and `LIKE`-based search filters exercise realistic,
  non-degenerate data distributions.
- **Seeding strategy:** additive. `tsx prisma/scripts/perfSeed.ts 100000` was
  run first (100,000 rows from empty), then `tsx prisma/scripts/perfSeed.ts 500000`
  was run again against the same file, topping up with 400,000 more rows to
  reach 500,000 total. Benchmarks were run once at each checkpoint (100k,
  then 500k) against the same growing dataset.
- **Benchmark harness:** `backend/prisma/scripts/perfBenchmark.ts`. Each
  query is run 5 times back-to-back and min/avg/max (`Date.now()` deltas) are
  reported. The reported numbers below are from a "warm" run (OS page cache
  populated) immediately after each seeding checkpoint.
- **Calling the real service code:** `timeline.service.ts` and
  `browserIntelligence.service.ts` both import the shared `prisma` singleton
  from `src/config/db.ts`, which is constructed as `new PrismaClient()` with
  no explicit datasource override — it relies on the ambient
  `DATABASE_URL`. Rather than reimplementing the query logic by hand,
  `perfBenchmark.ts` sets `process.env.DATABASE_URL` to point at
  `perf-test.db` **at the very top of the file, before importing** the
  service modules, so the singleton connects to `perf-test.db` from
  construction. This is safe because `perfBenchmark.ts` runs as its own
  isolated, one-shot `tsx` process — it is never the actual running dev
  server process, and the env var only affects this script's own process
  environment. This let the benchmark call the **real, unmodified**
  `TimelineService.getTimeline`, `TimelineService.getDaySummary`, and
  `BrowserIntelligenceService.getDomainAnalytics` functions.
- Query 5 (dashboard aggregate) has no single existing service function of
  that exact shape, so a raw Prisma `groupBy` mirroring a "time by category,
  last 30 days" dashboard widget was used instead, via a separate
  explicit-URL `PrismaClient` also pointed at `perf-test.db`.

## UnifiedEvent indexes (from `schema.prisma`, read-only — unmodified)

```prisma
model UnifiedEvent {
  ...
  @@index([userId, date])
  @@index([userId, sourceType, date])
  @@index([userId, startedAt])
}
```

Foreign keys: `userId -> User`, `deviceId -> Device` (nullable), `applicationId -> Application` (nullable), `categoryId -> Category` (nullable), `rawEventId -> RawEvent` (nullable, unique).

## Results

All timings in milliseconds, 5 runs each, reported as `min / avg / max`.

| # | Query | 100k rows | 500k rows |
|---|-------|-----------|-----------|
| 1 | `TimelineService.getTimeline` — plain keyset pagination, no filters/search | 54 / 56.0 / 58 | 304 / 369.8 / 511 |
| 2 | `TimelineService.getTimeline` — with search (`"code"`) + device + category filters | 36 / 37.2 / 38 | 245 / 266.2 / 298 |
| 3 | `TimelineService.getDaySummary` — 24-hourly-bucket aggregation for 1 day | 0 / 0.4 / 1 | 0 / 1.2 / 3 |
| 4 | `BrowserIntelligenceService.getDomainAnalytics` — domain aggregation over full ~400-day range | 15 / 15.6 / 17 | 85 / 93.8 / 110 |
| 5 | Dashboard aggregate — `groupBy(categoryId)` with `_sum(durationSeconds)` + `_count`, last 30 days | 2 / 2.4 / 3 | 14 / 14.6 / 15 |

Row counts confirmed by the benchmark script itself at each run: `100000` and `500000`.

## Scaling analysis (100k → 500k, a 5x row increase)

| Query | Time ratio (500k / 100k) | Implied scaling exponent (time ∝ N^k) | Interpretation |
|---|---|---|---|
| `getTimeline` (plain) | 6.60x | k ≈ 1.17 | Slightly super-linear. Consistent with an indexed range scan on `[userId, startedAt]` / `[userId, date]` plus a growing `include` join fan-out (application/category/device) and the separate `aggregate(_sum)` call the function also issues per request — cost is dominated by the keyset scan + join, not a table scan, but SQLite's B-tree traversal and join cost grow a bit faster than the row count alone. |
| `getTimeline` (search + filters) | 7.16x | k ≈ 1.22 | Slightly worse than the unfiltered case — the `LIKE '%code%'` search clause on `title`/`domain`/joined `application.canonicalName` cannot use an index (SQLite `LIKE` prefix scans only help with a leading, non-wildcard pattern), so its cost grows closer to the size of the *filtered* candidate set, which itself grows with total rows. |
| `getDaySummary` | 3.00x | k ≈ 0.68 | **Sub-linear.** This query is scoped by `[userId, date]` (single day), an exact-match on the index prefix, so its result set size is roughly constant regardless of total table size — the growth here reflects incidental variance (single-digit-ms noise) rather than true scan-cost growth. |
| `getDomainAnalytics` | 6.01x | k ≈ 1.12 | Slightly super-linear, similar to `getTimeline` — bounded by `take: 5000` but must still scan/filter on `[userId, sourceType, date]` before truncating, so the filter-then-limit cost grows with the size of the matching row set. |
| Dashboard `groupBy` | 6.08x | k ≈ 1.12 | Slightly super-linear — `groupBy` on a 30-day window filtered by `[userId, date]` index, with per-group aggregation cost growing with the number of matching rows in that window (which grows with total table size since rows are spread evenly across ~400 days). |

None of the five queries showed pathological (quadratic or worse) scaling; all stayed within roughly a 6-7x time increase for a 5x row increase, i.e., mildly super-linear (exponent ~1.1-1.2) except `getDaySummary`, which is effectively sub-linear/flat because it's scoped to a single day via an index prefix match.

## Projection to 1,000,000 rows

Using a power-law model `time(N) = time(500k) * (N / 500k)^k`, with `k` derived from the observed 100k→500k ratio for each query (`k = ln(ratio) / ln(5)`), projecting to 1M rows (a further 2x increase from 500k):

| Query | 500k avg (ms) | Projected 1M avg (ms) |
|---|---|---|
| `getTimeline` (plain) | 369.8 | ≈ 834 |
| `getTimeline` (search + filters) | 266.2 | ≈ 621 |
| `getDaySummary` | 1.2 | ≈ 2 |
| `getDomainAnalytics` | 93.8 | ≈ 203 |
| Dashboard `groupBy` | 14.6 | ≈ 32 |

**Caveats on the projection:** this is a curve fit through only two measured points (100k, 500k), not a third empirically-verified data point at 1M — treat it as a reasonable order-of-magnitude estimate, not a guarantee. In practice at 1M rows, `getTimeline`'s plain first-page query would likely still comfortably serve sub-second, but the `search`-filtered path (the one with no usable SQLite index for the `LIKE` clause) would remain the slowest and most sensitive to further growth — it is the best candidate for future optimization (e.g., an FTS5 virtual table or a dedicated search index) if the search UX needs to stay fast well beyond 1M rows.

## dev.db integrity check

- **Before any benchmarking work:** `UnifiedEvent` row count = `8`, file mtime = `1790228542` (`Thu Sep 24 11:12:22 IST 2026`), file size = `917504` bytes.
- **After benchmarking work completed:** `UnifiedEvent` row count = `17`, file mtime = `1790242243` (`Thu Sep 24 15:00:43 IST 2026`), file size = `929792` bytes.
- **This file DID change during the session — investigated and confirmed unrelated to this benchmark work.** All of this task's scripts (`perfSeed.ts`, `perfBenchmark.ts`, and the `prisma db push` calls) explicitly targeted `perf-test.db` via an explicit datasource URL override or a `DATABASE_URL` env override scoped to that one command — none of them ever pointed at `dev.db`. Investigation found a separate, already-running backend dev server process (`tsx src/index.ts`, PID 35307, started `Thu Sep 24 14:58:26 2026` — a process this task did not start) connected to `dev.db` via the ambient `.env` `DATABASE_URL="file:./dev.db"`. Its write to `dev.db` (`8 → 17` rows) landed at `15:00:43`, within that process's own uptime, and row count was stable (unchanged) when re-checked several seconds later — consistent with a one-time startup/seed-style write from that independent process (e.g., a job in the new `backend/src/jobs/` directory visible in git status as untracked), not an ongoing effect of the benchmark scripts. No `perf-test.db`-scoped script in this task was capable of touching `dev.db`, since each one either pinned an explicit `datasources.db.url` in the `PrismaClient` constructor or scoped a `DATABASE_URL` override to that single shell invocation.

## Cleanup

- `backend/prisma/perf-test.db` and any `-journal`/`-wal`/`-shm` sidecar files: **deleted** after the 500k benchmark run.
- `backend/prisma/schema.prisma` was read-only throughout; no migrations were run against `dev.db`.

## Files created

- `backend/prisma/scripts/perfSeed.ts` — additive synthetic-data seeder for `perf-test.db`.
- `backend/prisma/scripts/perfBenchmark.ts` — benchmark harness calling the real service functions.
- `V5_PERFORMANCE_REPORT.md` — this report.

## Judgment calls / workarounds

1. **`DATABASE_URL` env-var override for the benchmark's service calls.** Explained above; done because `timeline.service.ts` / `browserIntelligence.service.ts` import a prisma singleton with no dependency-injection seam. Safe because `perfBenchmark.ts` is a standalone, one-shot process, never the running dev server.
2. **Prisma CLI relative-path quirk.** `prisma db push` resolves a relative `DATABASE_URL` (e.g. `file:./prisma/perf-test.db`) relative to the *schema file's directory* (`backend/prisma/`), not the shell's cwd — using that path from `backend/` accidentally created `backend/prisma/prisma/perf-test.db` on a first attempt. Fixed by using `DATABASE_URL="file:./perf-test.db"` (relative to `prisma/`) for the `db push` command specifically. The seeding/benchmark scripts themselves use an absolute path resolved via `path.resolve(__dirname, ...)` passed directly to the `PrismaClient` constructor, which does not have this quirk.
3. **Seeding strategy is additive, not fresh-reseed-at-500k**, as documented above and in `perfSeed.ts`'s own comments — chosen so the 500k-row benchmark builds on the same distribution as the 100k one rather than introducing a second, differently-seeded dataset.
