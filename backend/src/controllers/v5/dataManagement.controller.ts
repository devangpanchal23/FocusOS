import { Response } from 'express';
import { prisma } from '../../config/db.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { Prisma } from '@prisma/client';

interface ExportFilters {
  from?: string;
  to?: string;
  sourceType?: string;
  deviceId?: string;
}

function buildWhere(userId: string, filters: ExportFilters): Prisma.UnifiedEventWhereInput {
  const where: Prisma.UnifiedEventWhereInput = { userId };
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) (where.date as any).gte = filters.from;
    if (filters.to) (where.date as any).lte = filters.to;
  }
  if (filters.sourceType) where.sourceType = filters.sourceType;
  if (filters.deviceId) where.deviceId = filters.deviceId;
  return where;
}

function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class DataManagementController {
  /**
   * GET /api/v5/data-management/export?format=json|csv&from&to&sourceType&deviceId
   */
  static async exportData(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const format = (req.query.format as string) === 'csv' ? 'csv' : 'json';
      const filters: ExportFilters = {
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        sourceType: req.query.sourceType as string | undefined,
        deviceId: req.query.deviceId as string | undefined,
      };
      const where = buildWhere(userId, filters);

      const events = await prisma.unifiedEvent.findMany({
        where,
        include: {
          application: { select: { canonicalName: true } },
          category: { select: { name: true } },
          device: { select: { name: true } },
        },
        orderBy: { startedAt: 'asc' },
        take: 50000, // safety cap
      });

      if (format === 'csv') {
        const headers = [
          'id', 'date', 'startedAt', 'endedAt', 'durationSeconds', 'sourceType', 'eventType',
          'application', 'category', 'domain', 'title', 'device', 'isDistraction', 'isIdle', 'confidence',
        ];
        const rows = events.map((e) =>
          [
            e.id,
            e.date,
            e.startedAt.toISOString(),
            e.endedAt ? e.endedAt.toISOString() : '',
            e.durationSeconds,
            e.sourceType,
            e.eventType,
            e.application?.canonicalName ?? '',
            e.category?.name ?? '',
            e.domain ?? '',
            e.title ?? '',
            e.device?.name ?? '',
            e.isDistraction,
            e.isIdle,
            e.confidence,
          ]
            .map(csvEscape)
            .join(',')
        );
        const csv = [headers.join(','), ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="focusos-unified-events.csv"');
        return res.send(csv);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="focusos-unified-events.json"');
      return res.send(JSON.stringify({ count: events.length, events }, null, 2));
    } catch (error) {
      console.error('DataManagementController.exportData error:', error);
      return res.status(500).json({ error: 'Failed to export data.' });
    }
  }

  /**
   * DELETE /api/v5/data-management/purge?from&to&sourceType&deviceId
   * Deletes matching UnifiedEvent rows in a transaction, then any now-orphaned
   * RawEvent rows (unifiedEvent relation null) matching the same filter criteria.
   */
  static async purgeData(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const filters: ExportFilters = {
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        sourceType: req.query.sourceType as string | undefined,
        deviceId: req.query.deviceId as string | undefined,
      };

      // Require at least one filter to avoid an accidental full wipe via a bare call.
      if (!filters.from && !filters.to && !filters.sourceType && !filters.deviceId) {
        return res.status(400).json({
          error: 'At least one filter (from, to, sourceType, deviceId) is required to purge data.',
        });
      }

      const unifiedWhere = buildWhere(userId, filters);

      const rawEventWhere: Prisma.RawEventWhereInput = { userId, unifiedEvent: null };
      if (filters.from || filters.to) {
        rawEventWhere.occurredAt = {};
        if (filters.from) (rawEventWhere.occurredAt as any).gte = new Date(`${filters.from}T00:00:00.000Z`);
        if (filters.to) (rawEventWhere.occurredAt as any).lte = new Date(`${filters.to}T23:59:59.999Z`);
      }
      if (filters.sourceType) {
        rawEventWhere.dataSource = { sourceType: filters.sourceType };
      }
      if (filters.deviceId) rawEventWhere.deviceId = filters.deviceId;

      const [deletedEvents, deletedRawEvents] = await prisma.$transaction([
        prisma.unifiedEvent.deleteMany({ where: unifiedWhere }),
        prisma.rawEvent.deleteMany({ where: rawEventWhere }),
      ]);

      return res.json({
        deletedUnifiedEvents: deletedEvents.count,
        deletedRawEvents: deletedRawEvents.count,
      });
    } catch (error) {
      console.error('DataManagementController.purgeData error:', error);
      return res.status(500).json({ error: 'Failed to purge data.' });
    }
  }
}
