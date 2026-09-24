// Local development entrypoint only — production (Vercel) uses api/index.ts
// at the repo root, which imports the compiled app.js directly and never
// executes this file, so the setInterval worker below and app.listen() only
// ever run during `npm run dev`/`npm start`.
import path from 'path';
import fs from 'fs';
import app from './app.js';
import { startIngestionRetryWorker } from './jobs/ingestionRetryWorker.js';
import { AutomationService } from './services/automation.service.js';

const DESIRED_PORT = Number(process.env.PORT) || 5000;

// Port-discovery file the frontend's Vite dev server reads to point its
// /api proxy at wherever the backend actually ended up binding, so a busy
// port never breaks the dev workflow on either side.
const portFile = path.resolve(process.cwd(), '..', '.dev-backend-port.json');

function writePortFile(port: number) {
  try {
    fs.writeFileSync(portFile, JSON.stringify({ port, pid: process.pid, updatedAt: new Date().toISOString() }));
  } catch {
    // best-effort only — the frontend proxy falls back to the desired port if this is unavailable
  }
}

function cleanupPortFile() {
  try {
    if (fs.existsSync(portFile)) {
      const current = JSON.parse(fs.readFileSync(portFile, 'utf-8'));
      if (current.pid === process.pid) fs.unlinkSync(portFile);
    }
  } catch {
    // best-effort cleanup only
  }
}

/**
 * Tries `desiredPort` first, then walks forward one port at a time (skipping
 * ports already rejected as in-use) up to `maxAttempts`, and finally falls
 * back to an OS-assigned ephemeral port (`listen(0, ...)`) if every
 * candidate in the range is taken. The server is never allowed to simply
 * exit because a port was busy.
 */
function startServer(desiredPort: number, maxAttempts = 20) {
  let attempt = 0;

  const tryListen = (port: number) => {
    const candidateServer = app.listen(port, () => {
      const actualPort = (candidateServer.address() as any).port;
      if (actualPort !== desiredPort) {
        console.warn(`⚠️ Port ${desiredPort} was busy — started on ${actualPort} instead.`);
      }
      console.log(`Focus Intelligence API server running on http://localhost:${actualPort}`);
      writePortFile(actualPort);

      // Version 5.1 background workers/seeds — started after the server is
      // listening so neither can block or delay startup. Each is
      // independently wrapped so a failure in one never crashes the process
      // or blocks the other; the recurring worker itself already guards
      // every tick.
      try {
        startIngestionRetryWorker();
        console.log('Ingestion retry worker started (60s interval).');
      } catch (err) {
        console.error('Failed to start ingestion retry worker (non-fatal):', err);
      }

      AutomationService.seedAutomationRuleTemplates()
        .then(() => console.log('Automation rule templates seeded.'))
        .catch((err) => console.error('Failed to seed automation rule templates (non-fatal):', err));
    });

    candidateServer.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        attempt += 1;
        if (attempt < maxAttempts) {
          tryListen(port + 1);
        } else {
          console.warn(`⚠️ Ports ${desiredPort}-${desiredPort + maxAttempts - 1} are all busy — asking the OS for a free port.`);
          tryListen(0); // 0 = let the OS pick any free ephemeral port
        }
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

    return candidateServer;
  };

  const server = tryListen(desiredPort);

  const shutdown = () => {
    cleanupPortFile();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer(DESIRED_PORT);
