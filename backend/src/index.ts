import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './routes/index.js';
import { startIngestionRetryWorker } from './jobs/ingestionRetryWorker.js';
import { AutomationService } from './services/automation.service.js';

const app = express();
const PORT = process.env.PORT || 5000;
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded screenshots statically for verification preview
app.use('/uploads', express.static(uploadDir));

// Mount API routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.',
  });
});

const server = app.listen(PORT, () => {
  console.log(`Focus Intelligence API server running on http://localhost:${PORT}`);
  console.log(`Serving uploads from ${uploadDir}`);

  // Version 5.1 background workers/seeds — started after the server is
  // listening so neither can block or delay startup. Each is independently
  // wrapped so a failure in one never crashes the process or blocks the
  // other; the recurring worker itself already guards every tick.
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

server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n⚠️ Port ${PORT} is already in use by another process.`);
    console.error(`To release port ${PORT}, run: npx kill-port ${PORT}\n`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});
