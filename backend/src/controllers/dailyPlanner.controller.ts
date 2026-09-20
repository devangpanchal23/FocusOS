import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { DailyPlannerService } from '../services/dailyPlanner.service.js';

export class DailyPlannerController {
  static async getPlan(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const plan = await DailyPlannerService.getDailyPlan(userId, date);
      res.json({ plan });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch daily plan' });
    }
  }

  static async generateAiPlan(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const date = req.body.date || new Date().toISOString().split('T')[0];
      const plan = await DailyPlannerService.generateAiDailyPlan(userId, date);
      res.json({ plan });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to generate AI plan' });
    }
  }

  static async toggleBlock(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { blockId } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const block = await DailyPlannerService.toggleBlockCompletion(userId, blockId);
      res.json({ block });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to toggle block completion' });
    }
  }

  static async addBlock(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { date, startTime, endTime, taskName, category, isFixed } = req.body;
      const block = await DailyPlannerService.addBlock(userId, date || new Date().toISOString().split('T')[0], {
        startTime,
        endTime,
        taskName,
        category,
        isFixed
      });

      res.status(201).json({ block });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to add block' });
    }
  }

  static async deleteBlock(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { blockId } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await DailyPlannerService.deleteBlock(userId, blockId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete block' });
    }
  }
}
