import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { PrivacyService } from '../services/privacy.service.js';

export class PrivacyController {
  static async getSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const summary = await PrivacyService.getPrivacySummary(userId);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch privacy summary' });
    }
  }

  static async purgeData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { scope } = req.body;
      if (!scope || !['SCREENSHOTS_ONLY', 'USAGE_METRICS_ONLY', 'ALL_TELEMETRY'].includes(scope)) {
        res.status(400).json({ error: 'Invalid purge scope. Must be SCREENSHOTS_ONLY, USAGE_METRICS_ONLY, or ALL_TELEMETRY' });
        return;
      }

      const result = await PrivacyService.purgeUserData(userId, scope);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to purge user data' });
    }
  }

  static async getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const logs = await PrivacyService.getAuditLogs(userId);
      res.json({ logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
    }
  }
}
