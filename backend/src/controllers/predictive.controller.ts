import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { PredictiveService } from '../services/predictive.service.js';

export class PredictiveController {
  static async getPredictions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const predictions = await PredictiveService.getPredictionSummary(userId);
      res.json(predictions);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to calculate predictions' });
    }
  }

  static async getRiskLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const risks = await PredictiveService.detectAndSyncRisks(userId);
      res.json({ risks });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch risk logs' });
    }
  }

  static async dismissRisk(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { riskId } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await PredictiveService.dismissRisk(userId, riskId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to dismiss risk' });
    }
  }
}
