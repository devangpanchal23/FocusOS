import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { GoalService } from '../services/goal.service.js';

export class GoalController {
  static async getGoals(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const goals = await GoalService.getGoals(userId);
      res.json({ goals });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch SMART goals' });
    }
  }

  static async createGoal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const goal = await GoalService.createGoal(userId, req.body);
      res.status(201).json({ goal });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create SMART goal' });
    }
  }

  static async updateGoal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { goalId } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const goal = await GoalService.updateGoal(userId, goalId, req.body);
      res.json({ goal });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update SMART goal' });
    }
  }

  static async deleteGoal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { goalId } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await GoalService.deleteGoal(userId, goalId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete SMART goal' });
    }
  }

  static async generateAiPlan(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { prompt } = req.body;
      const plan = await GoalService.generateAiPlan(prompt || '');
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to generate goal AI plan' });
    }
  }
}
