/**
 * Idle detection.
 *
 * `active-win` does not expose a reliable, cross-platform "seconds since last
 * input" value - some platforms/versions surface partial info (e.g. macOS can
 * report whether the frontmost app itself is idle in certain window states),
 * but there is no consistent OS-level idle API wired up here. Rather than
 * fabricate access to a real idle API we don't have, we infer idleness from
 * polling behavior: if the active app/window title has not changed across
 * IDLE_THRESHOLD_MS worth of consecutive polls, we mark the current bucket
 * as idle. This is a heuristic (a user reading a long article without
 * switching windows will eventually be flagged idle) documented honestly in
 * the README.
 */

export const DEFAULT_IDLE_THRESHOLD_MS = 120_000;

export class IdleTracker {
  private lastChangeAt: number = Date.now();
  private idleThresholdMs: number;

  constructor(idleThresholdMs: number = DEFAULT_IDLE_THRESHOLD_MS) {
    this.idleThresholdMs = idleThresholdMs;
  }

  /** Call whenever the polled app/window signature is compared to the previous poll. */
  recordSignature(changed: boolean, now: number = Date.now()): boolean {
    if (changed) {
      this.lastChangeAt = now;
      return false;
    }
    return now - this.lastChangeAt >= this.idleThresholdMs;
  }

  reset(now: number = Date.now()): void {
    this.lastChangeAt = now;
  }
}
