import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { BrowserIntelligenceService } from '../../services/v5/browserIntelligence.service.js';

export class BrowserIntelligenceController {
  static async ingestSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { deviceId, sessions } = req.body;
      if (!Array.isArray(sessions)) {
        return res.status(400).json({ error: 'sessions must be an array.' });
      }
      const result = await BrowserIntelligenceService.ingestSessions(userId, deviceId || null, sessions);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('BrowserIntelligence ingestSessions error:', error);
      return res.status(500).json({ error: 'Failed to ingest browser sessions.' });
    }
  }

  static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const summary = await BrowserIntelligenceService.getSummary(req.userId!);
      return res.json(summary);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch browser summary.' });
    }
  }

  static async getDomains(req: AuthenticatedRequest, res: Response) {
    try {
      const { from, to } = req.query;
      const analytics = await BrowserIntelligenceService.getDomainAnalytics(
        req.userId!,
        from as string | undefined,
        to as string | undefined
      );
      return res.json(analytics);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch domain analytics.' });
    }
  }

  static async getExclusions(req: AuthenticatedRequest, res: Response) {
    try {
      const exclusions = await BrowserIntelligenceService.listExclusions(req.userId!);
      return res.json({ exclusions });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch exclusion rules.' });
    }
  }

  static async createExclusion(req: AuthenticatedRequest, res: Response) {
    try {
      const { domainPattern, reason } = req.body;
      if (!domainPattern) {
        return res.status(400).json({ error: 'domainPattern is required.' });
      }
      const rule = await BrowserIntelligenceService.createExclusion(req.userId!, domainPattern, reason);
      return res.status(201).json({ rule });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create exclusion rule.' });
    }
  }

  static async deleteExclusion(req: AuthenticatedRequest, res: Response) {
    try {
      await BrowserIntelligenceService.deleteExclusion(req.userId!, req.params.id);
      return res.json({ message: 'Exclusion rule deleted.' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete exclusion rule.' });
    }
  }

  static async getCategoryRules(req: AuthenticatedRequest, res: Response) {
    try {
      const rules = await BrowserIntelligenceService.listCategoryRules(req.userId!);
      return res.json({ rules });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch category rules.' });
    }
  }

  static async createCategoryRule(req: AuthenticatedRequest, res: Response) {
    try {
      const { domainPattern, categoryId, isDistraction } = req.body;
      if (!domainPattern || !categoryId) {
        return res.status(400).json({ error: 'domainPattern and categoryId are required.' });
      }
      const rule = await BrowserIntelligenceService.createCategoryRule(req.userId!, {
        domainPattern,
        categoryId,
        isDistraction,
      });
      return res.status(201).json({ rule });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create category rule.' });
    }
  }
}
