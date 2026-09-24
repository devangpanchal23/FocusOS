import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { TimeIntelligenceService } from '../../services/v5/timeIntelligence.service.js';

export class TimeIntelligenceController {
  static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const summary = await TimeIntelligenceService.getDashboardSummary(req.userId!);
      return res.json(summary);
    } catch (error: any) {
      console.error('TimeIntelligence getSummary error:', error);
      return res.status(500).json({ error: 'Failed to fetch time intelligence summary.' });
    }
  }

  static async getAnomalies(req: AuthenticatedRequest, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const anomalies = await TimeIntelligenceService.detectAnomalies(req.userId!, date);
      return res.json({ date, anomalies });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch anomalies.' });
    }
  }

  static async recompute(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await TimeIntelligenceService.recomputeBaselines(req.userId!);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to recompute baselines.' });
    }
  }
}
