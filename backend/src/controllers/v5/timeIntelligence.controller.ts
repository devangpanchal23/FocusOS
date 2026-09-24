import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { TimeIntelligenceService } from '../../services/v5/timeIntelligence.service.js';

export class TimeIntelligenceController {
  static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const summary = await TimeIntelligenceService.getDashboardSummary(req.userId!);
      return res.json(summary);
    } catch (error: any) {
      console.error('TimeIntelligence getSummary error:', error);
      return res.status(500).json({ error: 'Failed to fetch time intelligence summary.' });
    }
  }

  static async getAnomalies(req: AuthenticatedRequest, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const anomalies = await TimeIntelligenceService.detectAnomalies(req.userId!, date);
      return res.json({ date, anomalies });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch anomalies.' });
    }
  }

  static async recompute(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await TimeIntelligenceService.recomputeBaselines(req.userId!);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to recompute baselines.' });
    }
  }

  static async getDistractionWindows(req: AuthenticatedRequest, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const thresholdMinutes = req.query.thresholdMinutes ? Number(req.query.thresholdMinutes) : 20;
      const windows = await TimeIntelligenceService.getDistractionWindows(req.userId!, date, thresholdMinutes);
      return res.json({ date, thresholdMinutes, windows });
    } catch (error) {
      console.error('TimeIntelligence getDistractionWindows error:', error);
      return res.status(500).json({ error: 'Failed to fetch distraction windows.' });
    }
  }

  static async getContextSwitching(req: AuthenticatedRequest, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const result = await TimeIntelligenceService.getContextSwitching(req.userId!, date);
      return res.json({ date, ...result });
    } catch (error) {
      console.error('TimeIntelligence getContextSwitching error:', error);
      return res.status(500).json({ error: 'Failed to fetch context switching data.' });
    }
  }

  static async getLongSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const sessions = await TimeIntelligenceService.getLongSessions(req.userId!, date);
      return res.json({ date, sessions });
    } catch (error) {
      console.error('TimeIntelligence getLongSessions error:', error);
      return res.status(500).json({ error: 'Failed to fetch long sessions.' });
    }
  }

  static async getUnusualSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const sessions = await TimeIntelligenceService.getUnusualSessions(req.userId!, date);
      return res.json({ date, sessions });
    } catch (error) {
      console.error('TimeIntelligence getUnusualSessions error:', error);
      return res.status(500).json({ error: 'Failed to fetch unusual sessions.' });
    }
  }

  static async getWeekdayWeekendComparison(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await TimeIntelligenceService.getWeekdayWeekendComparison(req.userId!);
      return res.json(result);
    } catch (error) {
      console.error('TimeIntelligence getWeekdayWeekendComparison error:', error);
      return res.status(500).json({ error: 'Failed to fetch weekday/weekend comparison.' });
    }
  }

  static async getPeriodBreakdown(req: AuthenticatedRequest, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const periods = await TimeIntelligenceService.getPeriodBreakdown(req.userId!, date);
      return res.json({ date, periods });
    } catch (error) {
      console.error('TimeIntelligence getPeriodBreakdown error:', error);
      return res.status(500).json({ error: 'Failed to fetch period breakdown.' });
    }
  }

  static async getPatternCards(req: AuthenticatedRequest, res: Response) {
    try {
      const cards = await TimeIntelligenceService.getPatternCards(req.userId!);
      return res.json({ cards });
    } catch (error) {
      console.error('TimeIntelligence getPatternCards error:', error);
      return res.status(500).json({ error: 'Failed to fetch pattern cards.' });
    }
  }

  static async getPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const preferences = await TimeIntelligenceService.getPreferences(req.userId!);
      return res.json(preferences);
    } catch (error) {
      console.error('TimeIntelligence getPreferences error:', error);
      return res.status(500).json({ error: 'Failed to fetch preferences.' });
    }
  }

  static async updatePreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const periodsJson =
        typeof req.body?.periodsJson === 'string' ? req.body.periodsJson : JSON.stringify(req.body?.periods ?? req.body);
      const preferences = await TimeIntelligenceService.updatePreferences(req.userId!, periodsJson);
      return res.json(preferences);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || 'Failed to update preferences.' });
    }
  }
}
