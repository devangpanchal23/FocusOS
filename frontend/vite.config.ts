import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// The backend auto-shifts to a free port when its default (5000) is busy
// (see backend/src/index.ts) and records whichever port it actually bound
// to in this file. Reading it here means the dev proxy always finds the
// backend instead of failing with a hardcoded target.
function resolveBackendTarget(): string {
  const portFile = path.resolve(__dirname, '..', '.dev-backend-port.json');
  try {
    const raw = fs.readFileSync(portFile, 'utf-8');
    const { port } = JSON.parse(raw);
    if (typeof port === 'number' && port > 0) {
      return `http://localhost:${port}`;
    }
  } catch {
    // file doesn't exist yet (backend not started) or is malformed — fall through to default
  }
  return 'http://localhost:5000';
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  // `router` (from the underlying http-proxy library) is invoked fresh on
  // every proxied request, so this stays correct even if the backend starts
  // after the frontend, or gets restarted on a different port mid-session —
  // unlike a static `target`, which is only resolved once at Vite startup.
  const router = () => resolveBackendTarget();

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // strictPort intentionally left unset (false): if 5173 is busy, Vite
      // automatically tries 5174, 5175, ... so the dev server never just dies.
      proxy: {
        '/api': {
          target: resolveBackendTarget(),
          router,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && 'writeHead' in res && !(res as any).headersSent) {
                (res as any).writeHead(503, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    error: 'Backend API is not responding. Start it with `npm run dev` in the backend folder — it will pick whichever port is free and this proxy will follow it automatically.',
                  })
                );
              }
            });
          },
        },
        '/uploads': {
          target: resolveBackendTarget(),
          router,
          changeOrigin: true,
        },
      },
    },
  };
});
