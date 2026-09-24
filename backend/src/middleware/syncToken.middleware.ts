import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';

export interface SyncTokenRequest extends Request {
  userId?: string;
  dataSourceId?: string;
}

export async function syncTokenMiddleware(req: SyncTokenRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-sync-token'];
    if (!token || typeof token !== 'string') {
      return res.status(401).json({ error: 'Sync token required. Missing X-Sync-Token header.' });
    }

    const dataSource = await prisma.dataSource.findUnique({ where: { syncToken: token } });
    if (!dataSource || dataSource.status === 'REVOKED') {
      return res.status(401).json({ error: 'Invalid or revoked sync token.' });
    }

    req.userId = dataSource.userId;
    req.dataSourceId = dataSource.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Failed to validate sync token.' });
  }
}
