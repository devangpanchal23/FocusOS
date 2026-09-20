import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AiCoachService } from '../services/aiCoach.service.js';

export class AiCoachController {
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await AiCoachService.getProfile(userId);
      res.json({ profile });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch coaching profile' });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const profile = await AiCoachService.updateProfile(userId, req.body);
      res.json({ profile });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update coaching profile' });
    }
  }

  static async getAssessment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const assessment = await AiCoachService.getCoachAssessment(userId);
      res.json(assessment);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to generate coaching assessment' });
    }
  }
}
