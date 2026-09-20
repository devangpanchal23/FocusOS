import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { SettingsService } from '../services/settings.service.js';

export class SettingsController {
  static async getSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const settings = await SettingsService.getSettings(req.user!.id);
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const updated = await SettingsService.updateSettings(req.user!.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
