import { Response } from 'express';
import { prisma } from '../../config/db.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

// Naive heuristic: sources that have synced before are assumed to sync again
// roughly on the same cadence as their last observed gap, capped between
// 5 minutes and 24 hours. This is a display-only estimate, never a guarantee.
function estimateNextSync(lastSyncAt: Date | null, lastSeenAt: Date | null): string | null {
  if (!lastSyncAt) return null;
  const reference = lastSeenAt && lastSeenAt > lastSyncAt ? lastSeenAt : lastSyncAt;
  const assumedIntervalMs = 15 * 60 * 1000; // 15 minutes, a reasonable default polling cadence
  return new Date(reference.getTime() + assumedIntervalMs).toISOString();
}

export class SyncCenterController {
  /**
   * GET /api/v5/sync-center
   * Action-oriented view: current state, lastSyncAt, a naive nextSyncEstimate,
   * and pending/failed/retrying counts per data source.
   */
  static async getOverview(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const dataSources = await prisma.dataSource.findMany({
        where: { userId },
        include: { device: true },
        orderBy: { createdAt: 'desc' },
      });

      const result = await Promise.all(
        dataSources.map(async (ds) => {
          const statusCounts = await prisma.rawEvent.groupBy({
            by: ['processingStatus'],
            where: { dataSourceId: ds.id },
            _count: true,
          });
          const counts: Record<string, number> = {};
          for (const row of statusCounts) counts[row.processingStatus] = (row as any)._count;

          return {
            id: ds.id,
            sourceType: ds.sourceType,
            deviceName: ds.device?.name ?? ds.label ?? ds.sourceType,
            status: ds.status,
            lastSyncAt: ds.lastSyncAt,
            nextSyncEstimate: estimateNextSync(ds.lastSyncAt, ds.lastSeenAt),
            pending: (counts['PENDING'] ?? 0) + (counts['PROCESSING'] ?? 0),
            failed: counts['FAILED'] ?? 0,
            retrying: counts['RETRYING'] ?? 0,
            permanentlyFailed: counts['PERMANENTLY_FAILED'] ?? 0,
            processed: counts['PROCESSED'] ?? 0,
          };
        })
      );

      return res.json({ sources: result });
    } catch (error) {
      console.error('SyncCenterController.getOverview error:', error);
      return res.status(500).json({ error: 'Failed to fetch sync center overview.' });
    }
  }

  /**
   * POST /api/v5/sync-center/:dataSourceId/retry
   * Finds that source's FAILED/PERMANENTLY_FAILED RawEvents and resets them
   * to PENDING/retryCount=0 for the ingestion retry worker to pick up.
   */
  static async retry(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { dataSourceId } = req.params;

      const dataSource = await prisma.dataSource.findUnique({ where: { id: dataSourceId } });
      if (!dataSource || dataSource.userId !== userId) {
        return res.status(404).json({ error: 'Data source not found.' });
      }

      const result = await prisma.rawEvent.updateMany({
        where: {
          dataSourceId,
          userId,
          processingStatus: { in: ['FAILED', 'PERMANENTLY_FAILED'] },
        },
        data: {
          processingStatus: 'PENDING',
          retryCount: 0,
          nextRetryAt: null,
          errorMessage: null,
        },
      });

      return res.json({ resetCount: result.count });
    } catch (error) {
      console.error('SyncCenterController.retry error:', error);
      return res.status(500).json({ error: 'Failed to retry data source.' });
    }
  }
}
