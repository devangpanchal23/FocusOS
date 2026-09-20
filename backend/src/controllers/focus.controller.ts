import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { FocusService } from '../services/focus.service.js';

export class FocusController {
  static async getProfiles(req: AuthRequest, res: Response): Promise<void> {
    try {
      const profiles = await FocusService.getProfiles(req.user!.id);
      res.json(profiles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const profile = await FocusService.createProfile(req.user!.id, req.body);
      res.status(201).json(profile);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await FocusService.updateProfile(req.user!.id, req.params.id, req.body);
      res.json({ message: 'Profile updated successfully', result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      await FocusService.deleteProfile(req.user!.id, req.params.id);
      res.json({ message: 'Profile deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async startSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const session = await FocusService.startSession(req.user!.id, req.body);
      res.status(201).json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async recordDistraction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const session = await FocusService.recordDistraction(req.user!.id, req.params.id);
      res.json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async completeSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await FocusService.completeSession(req.user!.id, req.params.id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async abortSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await FocusService.abortSession(req.user!.id, req.params.id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const sessions = await FocusService.getSessions(req.user!.id, limit);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await FocusService.getStats(req.user!.id);
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
