import activeWindow from "active-win";
import { enqueue } from "./queue.js";
import { IdleTracker, DEFAULT_IDLE_THRESHOLD_MS } from "./idle.js";
import { SleepWakeTracker, LockProxyTracker } from "./powerEvents.js";
import { getSettings, isAppExcluded, isWindowTitleExcluded } from "./settings.js";

interface Bucket {
  appName: string;
  windowTitle: string | null;
  startedAt: number;
  lastSeenAt: number;
  isIdle: boolean;
}

export interface TrackerOptions {
  pollIntervalMs: number;
  idleThresholdMs?: number;
  onError?: (err: unknown) => void;
}

/**
 * Polls the active window every `pollIntervalMs` and buckets consecutive
 * polls with the same app+title into a single session row. A bucket closes
 * (and is enqueued) either when the app/title changes or when it has been
 * open for 60s, whichever comes first - this keeps rows bounded in size
 * without losing app-switch resolution.
 */
export class Tracker {
  private timer: NodeJS.Timeout | null = null;
  private bucket: Bucket | null = null;
  private idleTracker: IdleTracker;
  private sleepWakeTracker: SleepWakeTracker;
  private lockProxyTracker: LockProxyTracker;
  private options: TrackerOptions;
  private readonly bucketMaxMs = 60_000;

  constructor(options: TrackerOptions) {
    this.options = options;
    const idleThresholdMs = options.idleThresholdMs ?? DEFAULT_IDLE_THRESHOLD_MS;
    this.idleTracker = new IdleTracker(idleThresholdMs);
    // Power-event inference (SLEEP/WAKE/LOCK/UNLOCK) - see powerEvents.ts for
    // the full documented heuristic/limitations.
    this.sleepWakeTracker = new SleepWakeTracker(options.pollIntervalMs);
    this.lockProxyTracker = new LockProxyTracker(idleThresholdMs);
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.poll().catch((err) => this.options.onError?.(err));
    }, this.options.pollIntervalMs);
    this.poll().catch((err) => this.options.onError?.(err));
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }

  private async poll(): Promise<void> {
    let result: activeWindow.Result | undefined;
    try {
      result = await activeWindow();
    } catch (err) {
      this.options.onError?.(err);
      return;
    }

    const now = Date.now();
    // Gap-detect SLEEP/WAKE against every successful poll (activeWindow()
    // resolved without throwing), whether or not a window was returned.
    this.sleepWakeTracker.recordPoll(now);

    if (!result) {
      // No focused window (e.g. all apps minimized, or unsupported platform state).
      this.flush();
      return;
    }

    const appName = result.owner?.name ?? "Unknown";
    const windowTitle = result.title ?? null;
    const signatureChanged =
      !this.bucket || this.bucket.appName !== appName || this.bucket.windowTitle !== windowTitle;

    const isIdle = this.idleTracker.recordSignature(!signatureChanged, now);
    this.lockProxyTracker.update(now, isIdle, this.idleTracker.getLastChangeAt());

    if (signatureChanged) {
      this.flush();
      this.bucket = {
        appName,
        windowTitle,
        startedAt: now,
        lastSeenAt: now,
        isIdle,
      };
      return;
    }

    this.bucket!.lastSeenAt = now;
    this.bucket!.isIdle = isIdle;

    if (now - this.bucket!.startedAt >= this.bucketMaxMs) {
      this.flush();
    }
  }

  private flush(): void {
    if (!this.bucket) return;

    // Client-side privacy filtering, best-effort only - see settings.ts.
    // Server-side enforcement in desktopAgent.service.ts is authoritative
    // regardless of what happens here; this just avoids collecting/sending
    // data the user has already told us to exclude.
    if (isAppExcluded(this.bucket.appName) || isWindowTitleExcluded(this.bucket.windowTitle)) {
      this.bucket = null;
      return;
    }

    const settings = getSettings();
    const durationSeconds = Math.max(
      1,
      Math.round((this.bucket.lastSeenAt - this.bucket.startedAt) / 1000)
    );
    enqueue({
      occurredAt: new Date(this.bucket.startedAt).toISOString(),
      appName: settings.collectAppNames ? this.bucket.appName : "Unknown",
      windowTitle: settings.collectWindowTitles ? this.bucket.windowTitle : null,
      isIdle: this.bucket.isIdle,
      durationSeconds,
    });
    this.bucket = null;
  }
}
