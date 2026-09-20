import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { BlockingService } from '../services/blocking.service.js';

export class BlockingController {
  static async getRules(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rules = await BlockingService.getRules(req.user!.id);
      res.json(rules);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rule = await BlockingService.createRule(req.user!.id, req.body);
      res.status(201).json(rule);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await BlockingService.updateRule(req.user!.id, req.params.id, req.body);
      res.json({ message: 'Rule updated', result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      await BlockingService.deleteRule(req.user!.id, req.params.id);
      res.json({ message: 'Rule deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createOverride(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { reason, overrideDurationMinutes } = req.body;
      const override = await BlockingService.createOverride(req.user!.id, {
        ruleId: req.params.id,
        reason,
        overrideDurationMinutes,
      });
      res.status(201).json(override);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getOverrides(req: AuthRequest, res: Response): Promise<void> {
    try {
      const overrides = await BlockingService.getOverrides(req.user!.id);
      res.json(overrides);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
