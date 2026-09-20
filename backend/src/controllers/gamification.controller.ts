import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { GamificationService } from '../services/gamification.service.js';

export class GamificationController {
  static async getGamification(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await GamificationService.getGamification(req.user!.id);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async checkAchievements(req: AuthRequest, res: Response): Promise<void> {
    try {
      await GamificationService.checkAchievements(req.user!.id);
      const data = await GamificationService.getGamification(req.user!.id);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
