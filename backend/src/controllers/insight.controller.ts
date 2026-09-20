import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { InsightService } from '../services/insight.service.js';

export class InsightController {
  static async getInsights(req: AuthRequest, res: Response): Promise<void> {
    try {
      const insights = await InsightService.generateInsights(req.user!.id);
      res.json(insights);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
