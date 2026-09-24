import "dotenv/config";
import { loadConfig, isRegistered, getConfigPath } from "./config.js";
import { Tracker } from "./tracker.js";
import { SyncLoop } from "./sync.js";
import { closeDb } from "./queue.js";

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

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`received ${signal}, shutting down gracefully...`);
    tracker.stop();
    syncLoop.stop();
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
