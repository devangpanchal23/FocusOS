import { Response } from 'express';
import { prisma } from '../../config/db.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { SyncTokenRequest } from '../../middleware/syncToken.middleware.js';
import { DesktopAgentService } from '../../services/v5/desktopAgent.service.js';

export class DesktopAgentController {
  static async register(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, os, timezone } = req.body;
      if (!name || !os) {
        return res.status(400).json({ error: 'name and os are required.' });
      }
      const result = await DesktopAgentService.registerDevice(req.userId!, { name, os, timezone });
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('DesktopAgent register error:', error);
      return res.status(500).json({ error: 'Failed to register desktop device.' });
    }
  }

  static async sync(req: SyncTokenRequest, res: Response) {
    try {
      const { events } = req.body;
      if (!Array.isArray(events)) {
        return res.status(400).json({ error: 'events must be an array.' });
      }
      const dataSource = await prisma.dataSource.findUnique({ where: { id: req.dataSourceId! } });
      const result = await DesktopAgentService.syncEvents(
        req.userId!,
        req.dataSourceId!,
        dataSource?.deviceId ?? null,
        events
      );
      return res.json(result);
    } catch (error: any) {
      console.error('DesktopAgent sync error:', error);
      return res.status(500).json({ error: 'Failed to sync desktop events.' });
    }
  }

  static async status(req: AuthenticatedRequest, res: Response) {
    try {
      const status = await DesktopAgentService.getStatus(req.userId!);
      return res.json({ dataSources: status });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch desktop agent status.' });
    }
  }
}
