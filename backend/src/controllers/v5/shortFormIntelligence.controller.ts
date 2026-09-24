import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ShortFormIntelligenceService } from '../../services/v5/shortFormIntelligence.service.js';

export class ShortFormIntelligenceController {
  static async sync(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const [fromBrowserEvents, fromDailyAggregates] = await Promise.all([
        ShortFormIntelligenceService.syncFromBrowserEvents(userId),
        ShortFormIntelligenceService.syncFromDailyAggregates(userId),
      ]);
      return res.json({
        createdFromBrowserEvents: fromBrowserEvents,
        createdFromDailyAggregates: fromDailyAggregates,
        totalCreated: fromBrowserEvents + fromDailyAggregates,
      });
    } catch (error) {
      console.error('ShortFormIntelligence sync error:', error);
      return res.status(500).json({ error: 'Failed to sync short-form sessions.' });
    }
  }

  static async getHotspots(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await ShortFormIntelligenceService.getHotspots(req.userId!);
      return res.json(result);
    } catch (error) {
      console.error('ShortFormIntelligence getHotspots error:', error);
      return res.status(500).json({ error: 'Failed to fetch short-form hotspots.' });
    }
  }

  static async getHeatmap(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await ShortFormIntelligenceService.getHeatmap(req.userId!);
      return res.json(result);
    } catch (error) {
      console.error('ShortFormIntelligence getHeatmap error:', error);
      return res.status(500).json({ error: 'Failed to fetch short-form heatmap.' });
    }
  }

  static async getPlatformComparison(req: AuthenticatedRequest, res: Response) {
    try {
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const result = await ShortFormIntelligenceService.getPlatformComparison(req.userId!, { from, to });
      return res.json({ platforms: result });
    } catch (error) {
      console.error('ShortFormIntelligence getPlatformComparison error:', error);
      return res.status(500).json({ error: 'Failed to fetch short-form platform comparison.' });
    }
  }

  static async getWeeklyPatterns(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await ShortFormIntelligenceService.getWeeklyPatterns(req.userId!);
      return res.json({ weeks: result });
    } catch (error) {
      console.error('ShortFormIntelligence getWeeklyPatterns error:', error);
      return res.status(500).json({ error: 'Failed to fetch short-form weekly patterns.' });
    }
  }

  static async getMonthlyTrends(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await ShortFormIntelligenceService.getMonthlyTrends(req.userId!);
      return res.json({ months: result });
    } catch (error) {
      console.error('ShortFormIntelligence getMonthlyTrends error:', error);
      return res.status(500).json({ error: 'Failed to fetch short-form monthly trends.' });
    }
  }

  static async detectRepeatedLoops(req: AuthenticatedRequest, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const result = await ShortFormIntelligenceService.detectRepeatedLoops(req.userId!, date);
      return res.json({ date, loops: result });
    } catch (error) {
      console.error('ShortFormIntelligence detectRepeatedLoops error:', error);
      return res.status(500).json({ error: 'Failed to detect short-form behavioral sequences.' });
    }
  }
}
