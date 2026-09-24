import "dotenv/config";
import { loadConfig, isRegistered, getConfigPath } from "./config.js";
import { Tracker } from "./tracker.js";
import { SyncLoop } from "./sync.js";
import { closeDb } from "./queue.js";
import { refreshSettings } from "./settings.js";

const SETTINGS_REFRESH_INTERVAL_MS = 5 * 60_000;

function log(msg: string): void {
  console.log(`[focusos-agent] ${new Date().toISOString()} ${msg}`);
}

async function main(): Promise<void> {
  const config = loadConfig();

  if (!isRegistered(config)) {
    console.log(
      `[focusos-agent] Not registered yet. Config file: ${getConfigPath()}\n` +
        `Run the register command first:\n` +
        `  npm run register -- --token=<jwt> --api-base=${config.apiBase}\n` +
        `or set FOCUSOS_TOKEN and run it interactively.`
    );
    return;
  }

  log(`starting - apiBase=${config.apiBase} deviceId=${config.deviceId}`);

  const tracker = new Tracker({
    pollIntervalMs: config.pollIntervalMs,
    onError: (err) => log(`tracker error: ${String(err)}`),
  });

  const syncLoop = new SyncLoop(config.syncIntervalMs, log);

  tracker.start();
  syncLoop.start();
  // Kick off an immediate sync attempt rather than waiting a full interval on startup.
  syncLoop.runOnce().catch((err) => log(`initial sync error: ${String(err)}`));

  // Privacy settings: best-effort client-side cache, refreshed on startup
  // and periodically. Server-side enforcement remains authoritative - see
  // settings.ts for the full explanation and the auth-mismatch caveat.
  refreshSettings(log).catch((err) => log(`initial settings fetch error: ${String(err)}`));
  const settingsTimer = setInterval(() => {
    refreshSettings(log).catch((err) => log(`settings refresh error: ${String(err)}`));
  }, SETTINGS_REFRESH_INTERVAL_MS);

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`received ${signal}, shutting down gracefully...`);
    tracker.stop();
    syncLoop.stop();
    clearInterval(settingsTimer);
    closeDb();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[focusos-agent] fatal error:", err);
  process.exitCode = 1;
});
