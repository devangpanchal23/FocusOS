import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AutomationService } from '../services/automation.service.js';
import { prisma } from '../config/db.js';

export class AutomationController {
  static async getRules(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rules = await AutomationService.getRules(req.user!.id);
      res.json(rules);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rule = await AutomationService.createRule(req.user!.id, req.body);
      res.status(201).json(rule);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await AutomationService.updateRule(req.user!.id, req.params.id, req.body);
      res.json({ message: 'Automation rule updated', result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      await AutomationService.deleteRule(req.user!.id, req.params.id);
      res.json({ message: 'Automation rule deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const logs = await AutomationService.getLogs(req.user!.id, limit);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async evaluateRules(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await AutomationService.evaluateRules(req.user!.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async testRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await AutomationService.testRule(req.user!.id, req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async testDraftRule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await AutomationService.testRule(req.user!.id, undefined, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /templates — list all built-in automation rule templates.
   */
  static async getTemplates(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const templates = await AutomationService.listTemplates();
      res.json(templates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * POST /templates/:key/instantiate — create a real (disabled) AutomationRule
   * for the current user from a template's default conditions/action.
   */
  static async instantiateTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rule = await AutomationService.instantiateTemplate(req.user!.id, req.params.key);
      res.status(201).json(rule);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * GET /rules/:id/delivery-log — the AutomationDeliveryLog rows for one rule
   * the caller owns.
   */
  static async getRuleDeliveryLog(req: AuthRequest, res: Response): Promise<void> {
    try {
      const rule = await prisma.automationRule.findFirst({
        where: { id: req.params.id, userId: req.user!.id },
        select: { id: true },
      });
      if (!rule) {
        res.status(404).json({ error: 'Automation rule not found.' });
        return;
      }

      const logs = await prisma.automationDeliveryLog.findMany({
        where: { ruleId: rule.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * GET /history — combined AutomationLog + AutomationDeliveryLog history for
   * the current user, filterable by ?ruleId= and ?from=&to= (ISO date bounds
   * on the log's triggeredAt/createdAt timestamp).
   */
  static async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const ruleId = typeof req.query.ruleId === 'string' ? req.query.ruleId : undefined;
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;
      const take = req.query.limit ? Math.min(parseInt(req.query.limit as string, 10) || 100, 500) : 100;

      const dateFilter: any = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);

      const [logs, deliveryLogs] = await Promise.all([
        prisma.automationLog.findMany({
          where: {
            userId,
            ...(ruleId ? { ruleId } : {}),
            ...(from || to ? { triggeredAt: dateFilter } : {}),
          },
          orderBy: { triggeredAt: 'desc' },
          take,
          include: { rule: { select: { id: true, name: true } } },
        }),
        prisma.automationDeliveryLog.findMany({
          where: {
            userId,
            ...(ruleId ? { ruleId } : {}),
            ...(from || to ? { createdAt: dateFilter } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take,
        }),
      ]);

      res.json({ logs, deliveryLogs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
