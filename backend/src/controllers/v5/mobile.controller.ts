import { Response } from 'express';
import { prisma } from '../../config/db.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { SyncTokenRequest } from '../../middleware/syncToken.middleware.js';
import { MobileService } from '../../services/v5/mobile.service.js';

export class MobileController {
  static async createLinkToken(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await MobileService.createLinkToken(req.userId!);
      return res.status(201).json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create mobile link token.' });
    }
  }

  static async claim(req: AuthenticatedRequest, res: Response) {
    try {
      const { code, deviceName } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'code is required.' });
      }
      const result = await MobileService.claimLinkToken(code, deviceName);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to claim link token.' });
    }
  }

  static async sync(req: SyncTokenRequest, res: Response) {
    try {
      const { events } = req.body;
      if (!Array.isArray(events)) {
        return res.status(400).json({ error: 'events must be an array.' });
      }
      const dataSource = await prisma.dataSource.findUnique({ where: { id: req.dataSourceId! } });
      const result = await MobileService.syncEvents(
        req.userId!,
        req.dataSourceId!,
        dataSource?.deviceId ?? null,
        events
      );
      return res.json(result);
    } catch (error: any) {
      console.error('Mobile sync error:', error);
      return res.status(500).json({ error: 'Failed to sync mobile events.' });
    }
  }

  static async getPermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await MobileService.getPermissions(req.userId!);
      return res.json({ permissions: result });
    } catch (error) {
      console.error('Mobile getPermissions error:', error);
      return res.status(500).json({ error: 'Failed to fetch mobile permissions.' });
    }
  }

  static async upsertPermission(req: AuthenticatedRequest, res: Response) {
    try {
      const { dataSourceId, permission, status, source } = req.body;
      if (!dataSourceId || !permission || !status) {
        return res.status(400).json({ error: 'dataSourceId, permission and status are required.' });
      }
      const result = await MobileService.upsertPermission(req.userId!, {
        dataSourceId,
        permission,
        status,
        source,
      });
      return res.json(result);
    } catch (error: any) {
      console.error('Mobile upsertPermission error:', error);
      return res.status(400).json({ error: error.message || 'Failed to upsert mobile permission.' });
    }
  }
}
