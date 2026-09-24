/**
 * Client-side privacy settings cache.
 *
 * Fetches `GET {apiBase}/v5/desktop/settings` on startup and periodically
 * (see index.ts), caches the result in memory, and lets tracker.ts consult
 * it before enqueueing a row so excluded apps/titles never even hit the
 * local queue.
 *
 * IMPORTANT - this is defense-in-depth / bandwidth-saving only, NOT the
 * source of truth. The plan's authoritative privacy enforcement lives
 * server-side in `desktopAgent.service.ts`'s `syncEvents`, which redacts/
 * drops data before storage regardless of what the agent sends. This client
 * never assumes it has successfully filtered anything - if this endpoint is
 * unreachable, returns an auth error, or doesn't exist yet, we fail open
 * (log and keep tracking normally) rather than crash or silently stop
 * collecting.
 *
 * Auth note / known gap: the desktop agent authenticates ordinary sync
 * traffic with a per-device `syncToken` (`X-Sync-Token` header, see
 * sync.ts) - it never holds a user JWT, since it's an unattended background
 * process. This module reuses that same `X-Sync-Token` header against the
 * settings endpoint. If the backend's `/v5/desktop/settings` route actually
 * requires a JWT (as a user-facing settings page would), this call will get
 * a 401, which is handled the same as any other unreachable case: log once,
 * fall back to permissive defaults, and keep working. See the completion
 * report for this pass for the explicit flag on this assumption.
 */

import { loadConfig } from "./config.js";

export interface DesktopAgentSettings {
  collectWindowTitles: boolean;
  collectAppNames: boolean;
  excludedApplications: string[];
  excludedWindowPatterns: string[];
}

const DEFAULT_SETTINGS: DesktopAgentSettings = {
  collectWindowTitles: true,
  collectAppNames: true,
  excludedApplications: [],
  excludedWindowPatterns: [],
};

let cached: DesktopAgentSettings = DEFAULT_SETTINGS;
let hasWarnedUnreachable = false;

export function getSettings(): DesktopAgentSettings {
  return cached;
}

/** Fetches and caches the latest settings. Never throws. */
export async function refreshSettings(onLog: (msg: string) => void = () => {}): Promise<void> {
  const config = loadConfig();
  if (!config.deviceId || !config.syncToken) {
    return; // Not registered yet - nothing to fetch against.
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(`${config.apiBase}/v5/desktop/settings`, {
        method: "GET",
        headers: { "X-Sync-Token": config.syncToken as string },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      if (!hasWarnedUnreachable) {
        onLog(
          `desktop settings endpoint returned HTTP ${response.status} - continuing with ` +
            `cached/default privacy settings (client-side filtering is best-effort only; ` +
            `server-side enforcement is authoritative regardless)`
        );
        hasWarnedUnreachable = true;
      }
      return;
    }

    const data = (await response.json()) as Partial<DesktopAgentSettings>;
    cached = {
      collectWindowTitles: data.collectWindowTitles ?? DEFAULT_SETTINGS.collectWindowTitles,
      collectAppNames: data.collectAppNames ?? DEFAULT_SETTINGS.collectAppNames,
      excludedApplications: Array.isArray(data.excludedApplications) ? data.excludedApplications : [],
      excludedWindowPatterns: Array.isArray(data.excludedWindowPatterns)
        ? data.excludedWindowPatterns
        : [],
    };
    hasWarnedUnreachable = false;
  } catch (err) {
    if (!hasWarnedUnreachable) {
      onLog(
        `desktop settings unreachable (${String(err)}) - continuing with cached/default ` +
          `privacy settings; server-side enforcement remains authoritative`
      );
      hasWarnedUnreachable = true;
    }
  }
}

export function isAppExcluded(appName: string): boolean {
  return cached.excludedApplications.some(
    (excluded) => excluded.toLowerCase() === appName.toLowerCase()
  );
}

export function isWindowTitleExcluded(title: string | null): boolean {
  if (!title) return false;
  const lowerTitle = title.toLowerCase();
  return cached.excludedWindowPatterns.some((pattern) =>
    lowerTitle.includes(pattern.toLowerCase())
  );
}
