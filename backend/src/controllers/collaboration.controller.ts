import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { CollaborationService } from '../services/collaboration.service.js';

export class CollaborationController {
  static async getCircles(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const circles = await CollaborationService.getUserCircles(userId);
      res.json({ circles });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch accountability circles' });
    }
  }

  static async createCircle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, description } = req.body;
      if (!name) {
        res.status(400).json({ error: 'Circle name is required' });
        return;
      }

      const circle = await CollaborationService.createCircle(userId, { name, description });
      res.status(201).json({ circle });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create circle' });
    }
  }

  static async joinCircle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { inviteCode } = req.body;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (!inviteCode) {
        res.status(400).json({ error: 'Invite code is required' });
        return;
      }

      const circle = await CollaborationService.joinCircle(userId, inviteCode);
      res.json({ circle, message: 'Joined circle successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to join circle' });
    }
  }

  static async leaveCircle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { circleId } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await CollaborationService.leaveCircle(userId, circleId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to leave circle' });
    }
  }

  static async getLeaderboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { circleId } = req.params;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const leaderboard = await CollaborationService.getCircleLeaderboard(userId, circleId);
      res.json(leaderboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch leaderboard' });
    }
  }
}
