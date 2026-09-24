import { Request, Response } from 'express';
import { runIngestionRetryTick } from '../../jobs/ingestionRetryWorker.js';

export class CronController {
  /**
   * Vercel Cron invokes this with `Authorization: Bearer <CRON_SECRET>`
   * (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
   * A one-shot equivalent of the local setInterval worker in
   * jobs/ingestionRetryWorker.ts, since serverless functions can't keep a
   * persistent timer alive between invocations.
   */
  static async retryIngestion(req: Request, res: Response) {
    const expected = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization;

    if (!expected) {
      return res.status(500).json({ error: 'CRON_SECRET is not configured on the server.' });
    }
    if (authHeader !== `Bearer ${expected}`) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    try {
      const result = await runIngestionRetryTick();
      return res.json({ ok: true, ...result });
    } catch (error) {
      console.error('Cron ingestion retry tick failed:', error);
      return res.status(500).json({ error: 'Ingestion retry tick failed.' });
    }
  }
}
