import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { TimelineService } from '../../services/v5/timeline.service.js';

function parseListParam(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') return value.split(',').filter(Boolean);
  return undefined;
}

export class TimelineController {
  static async getTimeline(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const todayStr = new Date().toISOString().split('T')[0];
      const from = (req.query.from as string) || todayStr;
      const to = (req.query.to as string) || todayStr;

      const result = await TimelineService.getTimeline(userId, {
        from,
        to,
        deviceIds: parseListParam(req.query.deviceIds),
        categoryIds: parseListParam(req.query.categoryIds),
        sourceTypes: parseListParam(req.query.sourceTypes),
        cursor: req.query.cursor as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      return res.json(result);
    } catch (error: any) {
      console.error('Timeline getTimeline error:', error);
      return res.status(500).json({ error: 'Failed to fetch timeline.' });
    }
  }

  static async getDaySummary(req: AuthenticatedRequest, res: Response) {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const result = await TimelineService.getDaySummary(req.userId!, date);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch day summary.' });
    }
  }
}
