import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { MobileService } from '../../services/v5/mobile.service.js';

export class MobileController {
  static async createLinkToken(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await MobileService.createLinkToken(req.userId!);
      return res.status(201).json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create mobile link token.' });
    }
  }

  static async claim(req: AuthenticatedRequest, res: Response) {
    try {
      const { code, deviceName } = req.body;
      if (!code) {
        return res.status(400).json({ error: 'code is required.' });
      }
      const result = await MobileService.claimLinkToken(code, deviceName);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to claim link token.' });
    }
  }
}
