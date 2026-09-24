import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { AuthenticatedRequest } from './auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'focus_intelligence_secret_key_super_secure_jwt_token_2026';

/**
 * Accepts EITHER a JWT (Authorization: Bearer <token>, for the frontend
 * settings UI which needs to read/display current settings) OR an
 * X-Sync-Token header (for the unattended desktop agent, which only holds a
 * sync-token and needs to read privacy settings before syncing so it can
 * apply filtering client-side too). Resolves req.userId either way. Used
 * only for read (GET) endpoints that are safe to expose to a sync-token
 * caller — write endpoints should stay JWT-only via authMiddleware.
 */
export async function jwtOrSyncTokenMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        req.userId = decoded.userId;
        req.user = { id: decoded.userId, userId: decoded.userId };
        return next();
      } catch {
        // fall through to sync-token check below
      }
    }

    const syncToken = req.headers['x-sync-token'];
    if (syncToken && typeof syncToken === 'string') {
      const dataSource = await prisma.dataSource.findUnique({ where: { syncToken } });
      if (dataSource && dataSource.status !== 'REVOKED') {
        req.userId = dataSource.userId;
        return next();
      }
    }

    return res.status(401).json({ error: 'Authentication required (JWT or X-Sync-Token).' });
  } catch (error) {
    return res.status(401).json({ error: 'Failed to authenticate request.' });
  }
}
