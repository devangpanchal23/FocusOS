/**
 * Power-event inference: SLEEP / WAKE / LOCK / UNLOCK.
 *
 * Node has no reliable, risk-free, cross-platform hook for real OS power
 * events (macOS `IOKit` power notifications, Windows `WM_POWERBROADCAST`,
 * Linux `systemd-logind` DBus signals) without adding native bindings per
 * platform. Rather than do that, this module infers these events from
 * behavior the agent already observes - the same honesty trade-off
 * `idle.ts` documents for idle detection. Every event produced here is
 * tagged `detectionMethod: 'INFERRED'` end to end (local queue row -> sync
 * payload -> backend `UnifiedEvent.metadataJson`), so nothing downstream
 * can mistake it for a real OS power/lock signal.
 *
 * SLEEP/WAKE inference
 * ---------------------
 * `tracker.ts` polls the active window on a fixed interval (`pollIntervalMs`,
 * default 5s). While the machine is asleep, `setInterval` callbacks don't
 * fire (the process itself is suspended), so the next poll after wake lands
 * far later than expected. If the gap between two consecutive *successful*
 * polls exceeds `gapMultiplier` (2x) the configured poll interval, we infer
 * the machine was asleep for that gap: a SLEEP event dated at the last
 * successful poll, and a WAKE event dated at the new poll, with
 * `durationSeconds` on the SLEEP event equal to the gap length. This can
 * also false-positive on a heavily throttled/suspended process (e.g. a
 * laptop lid closed briefly, OS thermal throttling, or the event loop being
 * blocked by something else) - it is a proxy for "the agent stopped being
 * scheduled for a while," not a verified sleep/wake syscall.
 *
 * LOCK/UNLOCK proxy
 * ------------------
 * There's no portable "screen locked" API wired up here either. Instead we
 * reuse `idle.ts`'s existing idle-signature tracking: if the active
 * app/window signature has been unchanged for `lockMultiplier` (2x) the
 * normal idle threshold (i.e. well beyond the point the bucket is already
 * flagged idle), we infer the screen was locked. When the signature changes
 * again (user resumes activity), we infer UNLOCK. This is explicitly a
 * heuristic proxy, not real OS lock-state detection: a user who steps away
 * without locking (e.g. leaves a video playing, or just doesn't touch the
 * machine) will eventually be flagged "locked" even though the session was
 * never actually locked, and a user who locks the screen but the agent
 * happens to sample the boundary before it accumulates lockMultiplier's
 * worth of idle time may see LOCK arrive later than the real lock did.
 */

import { enqueue, type EventType } from "./queue.js";

const SYSTEM_APP_NAME = "SYSTEM";

function enqueuePowerEvent(params: {
  occurredAtMs: number;
  eventType: EventType;
  isIdle: boolean;
  durationSeconds: number;
}): void {
  enqueue({
    occurredAt: new Date(params.occurredAtMs).toISOString(),
    appName: SYSTEM_APP_NAME,
    windowTitle: null,
    isIdle: params.isIdle,
    durationSeconds: params.durationSeconds,
    eventType: params.eventType,
    detectionMethod: "INFERRED",
  });
}

/**
 * Detects SLEEP/WAKE from gaps between consecutive successful polls.
 * Call `recordPoll(now)` once per successful poll (i.e. after
 * `activeWindow()` resolves without throwing), regardless of whether a
 * window was returned.
 */
export class SleepWakeTracker {
  private lastPollAt: number | null = null;

  constructor(
    private readonly pollIntervalMs: number,
    private readonly gapMultiplier: number = 2
  ) {}

  recordPoll(now: number): void {
    if (this.lastPollAt !== null) {
      const gap = now - this.lastPollAt;
      const sleepThresholdMs = this.pollIntervalMs * this.gapMultiplier;
      if (gap > sleepThresholdMs) {
        enqueuePowerEvent({
          occurredAtMs: this.lastPollAt,
          eventType: "SLEEP",
          isIdle: true,
          durationSeconds: Math.round(gap / 1000),
        });
        enqueuePowerEvent({
          occurredAtMs: now,
          eventType: "WAKE",
          isIdle: false,
          durationSeconds: 0,
        });
      }
    }
    this.lastPollAt = now;
  }
}

/**
 * Infers LOCK/UNLOCK from sustained idle periods, proxying off the same
 * idle-signature state `idle.ts` already tracks. Call `update(...)` once per
 * poll with the current idle flag and the idle tracker's `getLastChangeAt()`.
 */
export class LockProxyTracker {
  private locked = false;

  constructor(
    private readonly idleThresholdMs: number,
    private readonly lockMultiplier: number = 2
  ) {}

  update(now: number, isIdle: boolean, lastSignatureChangeAt: number): void {
    const lockThresholdMs = this.idleThresholdMs * this.lockMultiplier;
    const sustainedIdleMs = now - lastSignatureChangeAt;

    if (!this.locked && isIdle && sustainedIdleMs >= lockThresholdMs) {
      this.locked = true;
      enqueuePowerEvent({
        // Best-effort: date it at the point the lock threshold was crossed,
        // not "now", since the actual lock likely happened earlier.
        occurredAtMs: lastSignatureChangeAt + lockThresholdMs,
        eventType: "LOCK",
        isIdle: true,
        durationSeconds: 0,
      });
    } else if (this.locked && !isIdle) {
      this.locked = false;
      enqueuePowerEvent({
        occurredAtMs: now,
        eventType: "UNLOCK",
        isIdle: false,
        durationSeconds: 0,
      });
    }
  }
}
