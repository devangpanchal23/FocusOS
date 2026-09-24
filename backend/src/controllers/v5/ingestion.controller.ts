import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { prisma } from '../../config/db.js';

export class IngestionController {
  static async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const [statusGroups, processedSample, lastSuccess, lastFailure] = await Promise.all([
        prisma.rawEvent.groupBy({
          by: ['processingStatus'],
          where: { userId },
          _count: true,
        }),
        prisma.rawEvent.findMany({
          where: { userId, processingStatus: 'PROCESSED', unifiedEvent: { isNot: null } },
          select: { receivedAt: true, unifiedEvent: { select: { createdAt: true } } },
          orderBy: { receivedAt: 'desc' },
          take: 500,
        }),
        prisma.unifiedEvent.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        prisma.rawEvent.findFirst({
          where: { userId, processingStatus: { in: ['FAILED', 'PERMANENTLY_FAILED'] } },
          orderBy: { receivedAt: 'desc' },
          select: { id: true, processingStatus: true, errorMessage: true, receivedAt: true, retryCount: true },
        }),
      ]);

      const counts: Record<string, number> = {};
      for (const group of statusGroups) {
        counts[group.processingStatus] = group._count;
      }

      const diffs = processedSample
        .filter((r) => r.unifiedEvent)
        .map((r) => r.unifiedEvent!.createdAt.getTime() - r.receivedAt.getTime());
      const avgProcessingTimeMs =
        diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;

      return res.json({
        counts,
        avgProcessingTimeMs,
        lastSuccessAt: lastSuccess?.createdAt ?? null,
        lastFailure: lastFailure ?? null,
      });
    } catch (error) {
      console.error('IngestionController.getStats error:', error);
      return res.status(500).json({ error: 'Failed to fetch ingestion stats.' });
    }
  }
}
