import { loadConfig, isRegistered, AgentConfig } from "./config.js";
import { getQueuedBatch, markSynced, QueueRow } from "./queue.js";

const BATCH_LIMIT = 200;
const BACKOFF_STEPS_MS = [5_000, 30_000, 120_000];

interface SyncEventPayload {
  appName: string;
  windowTitle?: string;
  isIdle: boolean;
  durationSeconds: number;
}

interface SyncEvent {
  occurredAt: string;
  payload: SyncEventPayload;
}

interface SyncResponse {
  accepted: number;
  duplicates: number;
  failed: number;
}

function rowToEvent(row: QueueRow): SyncEvent {
  return {
    occurredAt: row.occurredAt,
    payload: {
      appName: row.appName,
      windowTitle: row.windowTitle ?? undefined,
      isIdle: row.isIdle === 1,
      durationSeconds: row.durationSeconds,
    },
  };
}

export class SyncLoop {
  private timer: NodeJS.Timeout | null = null;
  private backoffIndex = -1;
  private running = false;
  private stopped = false;
  private onLog: (msg: string) => void;

  constructor(private intervalMs: number, onLog: (msg: string) => void = () => {}) {
    this.onLog = onLog;
  }

  start(): void {
    if (this.timer) return;
    this.scheduleNext(this.intervalMs);
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(delayMs: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.runOnce()
        .catch((err) => this.onLog(`sync error: ${String(err)}`))
        .finally(() => {
          if (!this.stopped) this.scheduleNext(this.currentDelay());
        });
    }, delayMs);
  }

  private currentDelay(): number {
    if (this.backoffIndex < 0) return this.intervalMs;
    return BACKOFF_STEPS_MS[Math.min(this.backoffIndex, BACKOFF_STEPS_MS.length - 1)];
  }

  /** Runs a single sync attempt immediately. Exposed for manual/test invocation. */
  async runOnce(): Promise<SyncResponse | null> {
    if (this.running) return null;
    this.running = true;
    try {
      const result = await runSync(this.onLog);
      if (result === null) {
        this.noteFailure();
      } else {
        this.noteSuccess();
      }
      return result;
    } finally {
      this.running = false;
    }
  }

  private noteSuccess(): void {
    this.backoffIndex = -1;
  }

  private noteFailure(): void {
    this.backoffIndex = Math.min(this.backoffIndex + 1, BACKOFF_STEPS_MS.length - 1);
  }
}

export async function runSync(onLog: (msg: string) => void = () => {}): Promise<SyncResponse | null> {
  const config = loadConfig();
  if (!isRegistered(config)) {
    onLog("desktop agent not registered - skipping sync");
    return null;
  }

  const rows = getQueuedBatch(BATCH_LIMIT);
  if (rows.length === 0) {
    return { accepted: 0, duplicates: 0, failed: 0 };
  }

  const events = rows.map(rowToEvent);

  try {
    const response = await fetchWithTimeout(`${config.apiBase}/v5/desktop/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sync-Token": config.syncToken as string,
      },
      body: JSON.stringify({ deviceId: config.deviceId, events }),
    });

    if (!response.ok) {
      onLog(`sync failed with status ${response.status} - leaving ${rows.length} rows queued`);
      return null;
    }

    const data = (await response.json()) as SyncResponse;
    // The backend confirms how many it accepted/deduped; since it processes
    // rows in the order sent, we mark that many of our oldest queued rows
    // (accepted + duplicates, both terminal outcomes) as done, leaving any
    // failed ones queued for retry.
    const settledCount = (data.accepted ?? 0) + (data.duplicates ?? 0);
    const settledIds = rows.slice(0, settledCount).map((r) => r.id);
    markSynced(settledIds);
    onLog(
      `sync ok: accepted=${data.accepted} duplicates=${data.duplicates} failed=${data.failed}, cleared ${settledIds.length} local rows`
    );
    return data;
  } catch (err) {
    onLog(`sync request failed: ${String(err)} - leaving ${rows.length} rows queued for retry`);
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export type { AgentConfig };
