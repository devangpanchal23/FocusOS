import { Response } from 'express';
import { prisma } from '../../config/db.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';

export class DataSourcesController {
  /**
   * GET /api/v5/data-sources
   * All DataSource rows for the user with type/device/status/lastSync,
   * plus RawEvent counts grouped by processingStatus per source, plus the
   * most recent error for that source.
   */
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const dataSources = await prisma.dataSource.findMany({
        where: { userId },
        include: { device: true },
        orderBy: { createdAt: 'desc' },
      });

      const result = await Promise.all(
        dataSources.map(async (ds) => {
          const [statusCounts, lastError] = await Promise.all([
            prisma.rawEvent.groupBy({
              by: ['processingStatus'],
              where: { dataSourceId: ds.id },
              _count: true,
            }),
            prisma.rawEvent.findFirst({
              where: { dataSourceId: ds.id, processingStatus: { in: ['FAILED', 'PERMANENTLY_FAILED'] } },
              orderBy: { receivedAt: 'desc' },
              select: { id: true, processingStatus: true, errorMessage: true, receivedAt: true },
            }),
          ]);

          const counts: Record<string, number> = {};
          for (const row of statusCounts) {
            counts[row.processingStatus] = (row as any)._count;
          }

          return {
            id: ds.id,
            sourceType: ds.sourceType,
            deviceId: ds.deviceId,
            deviceName: ds.device?.name ?? null,
            instanceKey: ds.instanceKey,
            label: ds.label,
            status: ds.status,
            lastSeenAt: ds.lastSeenAt,
            lastSyncAt: ds.lastSyncAt,
            createdAt: ds.createdAt,
            eventCounts: counts,
            lastError: lastError,
          };
        })
      );

      return res.json({ dataSources: result });
    } catch (error) {
      console.error('DataSourcesController.list error:', error);
      return res.status(500).json({ error: 'Failed to fetch data sources.' });
    }
  }
}
