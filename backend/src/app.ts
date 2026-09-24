import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/index.js';
import { useBlobStorage, ensureLocalUploadDir, localUploadDir } from './services/storage.service.js';

const app = express();

// Explicit production origins (comma-separated) take priority; in
// development, any localhost/127.0.0.1 origin is allowed regardless of
// port, since the backend may auto-shift ports (see index.ts's startServer)
// and the frontend dev server picks its own port too.
const explicitOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // same-origin / curl / server-to-server
      if (explicitOrigins.includes(origin)) return callback(null, true);
      if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded screenshots statically only when NOT using Vercel Blob —
// production filesystems are ephemeral/read-only, so nothing should try to
// create or write to a local uploads directory there (storage.service.ts
// routes files to Blob instead in that case).
if (!useBlobStorage) {
  ensureLocalUploadDir();
  app.use('/uploads', express.static(localUploadDir));
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
