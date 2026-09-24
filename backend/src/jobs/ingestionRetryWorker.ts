import { prisma } from '../config/db.js';
import { EventStoreService } from '../services/v5/eventStore.service.js';

const TICK_INTERVAL_MS = 60_000;
const BATCH_SIZE = 200;

export interface IngestionRetryTickResult {
  candidatesFound: number;
  attempted: number;
  errored: number;
}

/**
 * Scans for RawEvent rows stuck in FAILED/RETRYING state whose next-retry
 * window has elapsed, and re-attempts transformation via
 * EventStoreService.reprocessRawEvent. Backoff/give-up bookkeeping
 * (retryCount, nextRetryAt, PERMANENTLY_FAILED) lives inside
 * reprocessRawEvent itself. Exported so it can be driven by either the local
 * setInterval loop (see startIngestionRetryWorker) or a one-shot Vercel Cron
 * invocation (see controllers/v5/cron.controller.ts) — serverless functions
 * can't keep a persistent timer alive between invocations, so production
 * relies on the cron route calling this directly instead.
 */
export async function runIngestionRetryTick(): Promise<IngestionRetryTickResult> {
  const now = new Date();
  let attempted = 0;
  let errored = 0;

  const candidates = await prisma.rawEvent.findMany({
    where: {
      processingStatus: { in: ['FAILED', 'RETRYING'] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    select: { id: true, retryCount: true, maxRetries: true },
    take: BATCH_SIZE,
  });

  const due = candidates.filter((c) => c.retryCount < c.maxRetries);

  for (const candidate of due) {
    attempted += 1;
    try {
      await EventStoreService.reprocessRawEvent(candidate.id);
    } catch (err) {
      errored += 1;
      console.error(`ingestionRetryWorker: failed to reprocess RawEvent ${candidate.id}`, err);
    }
  }

  return { candidatesFound: candidates.length, attempted, errored };
}

/**
 * Starts the recurring local-dev retry worker. Returns immediately; does not
 * run a tick synchronously before the first interval fires. Never used in
 * production — see the module-level comment on runIngestionRetryTick.
 */
export function startIngestionRetryWorker(): NodeJS.Timeout {
  return setInterval(() => {
    runIngestionRetryTick().catch((err) => console.error('ingestionRetryWorker: tick failed', err));
  }, TICK_INTERVAL_MS);
}
