import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/index.js';
import { useBlobStorage, ensureLocalUploadDir, localUploadDir } from './services/storage.service.js';

const app = express();

// Explicit extra origins (comma-separated) take priority — for cases like a
// separate custom domain that doesn't match the deploying request's own
// Host header. In development, any localhost/127.0.0.1 origin is allowed
// regardless of port, since the backend may auto-shift ports (see
// index.ts's startServer) and the frontend dev server picks its own port
// too.
const explicitOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';

// This is a same-origin deployment by design (§C of the Vercel migration:
// frontend static files and the /api/* rewrite both live on the same
// domain), so the Origin header on a request should always equal that same
// request's own Host — comparing against req.headers.host, rather than a
// fixed list, means this works automatically for the production alias, any
// preview-deployment URL, and a future custom domain, with no env var to
// keep in sync. corsOptionsDelegate (not the plain `origin` callback) is
// what gives this function access to `req`.
app.use(
  cors((req, callback) => {
    const origin = req.headers.origin;
    let allowed = false;

    if (!origin) {
      allowed = true; // same-origin non-CORS request / curl / server-to-server
    } else if (explicitOrigins.includes(origin)) {
      allowed = true;
    } else if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      allowed = true;
    } else {
      try {
        const originHost = new URL(origin).host;
        if (originHost === req.headers.host) allowed = true;
      } catch {
        // malformed Origin header — leave allowed=false
      }
    }

    callback(null, { origin: allowed, credentials: true });
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded screenshots from local disk only in a real local-filesystem
// environment (never on Vercel, where the deployment filesystem is
// read-only outside /tmp — process.env.VERCEL is set automatically by the
// platform). When Blob isn't configured yet on Vercel, uploads simply won't
// have a working storage backend until BLOB_READ_WRITE_TOKEN is set — that
// degrades the upload feature, but must never crash the whole app at module
// load, which previously took down every route, not just uploads. The
// try/catch is defense-in-depth on top of the environment check.
if (!useBlobStorage && !process.env.VERCEL) {
  try {
    ensureLocalUploadDir();
    app.use('/uploads', express.static(localUploadDir));
  } catch (err) {
    console.error('Failed to set up local upload directory (non-fatal):', err);
  }
}

// Mount API routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.',
  });
});

export default app;
