import { prisma } from '../config/db.js';
import { EventStoreService } from '../services/v5/eventStore.service.js';

const TICK_INTERVAL_MS = 60_000;
const BATCH_SIZE = 200;

/**
 * Periodically scans for RawEvent rows stuck in FAILED/RETRYING state whose
 * next-retry window has elapsed, and re-attempts transformation via
 * EventStoreService.reprocessRawEvent. Backoff/give-up bookkeeping (retryCount,
 * nextRetryAt, PERMANENTLY_FAILED) lives inside reprocessRawEvent itself.
 */
async function runTick(): Promise<void> {
  try {
    const now = new Date();

    const candidates = await prisma.rawEvent.findMany({
      where: {
        processingStatus: { in: ['FAILED', 'RETRYING'] },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      select: { id: true, retryCount: true, maxRetries: true },
      take: BATCH_SIZE,
    });

    const due = candidates.filter((c) => c.retryCount < c.maxRetries);
    if (due.length === 0) return;

    for (const candidate of due) {
      try {
        await EventStoreService.reprocessRawEvent(candidate.id);
      } catch (err) {
        console.error(`ingestionRetryWorker: failed to reprocess RawEvent ${candidate.id}`, err);
      }
    }
  } catch (err) {
    console.error('ingestionRetryWorker: tick failed', err);
  }
}

/**
 * Starts the recurring retry worker. Returns immediately; does not block
 * module load or run a tick synchronously before the first interval fires.
 */
export function startIngestionRetryWorker(): NodeJS.Timeout {
  return setInterval(() => {
    void runTick();
  }, TICK_INTERVAL_MS);
}
