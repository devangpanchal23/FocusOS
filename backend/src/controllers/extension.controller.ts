import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { ExtensionService } from '../services/extension.service.js';

export class ExtensionController {
  static async getConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const config = await ExtensionService.getExtensionConfig(userId);
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch extension config' });
    }
  }

  static async syncHeartbeat(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { domain, durationSeconds, isDistraction, activeTabTitle } = req.body;
      const result = await ExtensionService.syncHeartbeat(userId, {
        domain: domain || 'unknown',
        durationSeconds: Number(durationSeconds) || 30,
        isDistraction: Boolean(isDistraction),
        activeTabTitle
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to sync extension heartbeat' });
    }
  }

  static async evaluateDomain(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const domain = (req.query.domain as string) || (req.body.domain as string) || '';
      const evaluation = await ExtensionService.evaluateDomain(userId, domain);
      res.json(evaluation);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to evaluate domain' });
    }
  }
}
