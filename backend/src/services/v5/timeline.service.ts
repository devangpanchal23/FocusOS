import { prisma } from '../../config/db.js';

export interface TimelineQuery {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  deviceIds?: string[];
  categoryIds?: string[];
  sourceTypes?: string[];
  cursor?: string; // `${startedAtISO}_${id}`
  limit?: number;
}

function decodeCursor(cursor?: string): { startedAt: Date; id: string } | null {
  if (!cursor) return null;
  const idx = cursor.lastIndexOf('_');
  if (idx === -1) return null;
  const iso = cursor.slice(0, idx);
  const id = cursor.slice(idx + 1);
  const startedAt = new Date(iso);
  if (isNaN(startedAt.getTime()) || !id) return null;
  return { startedAt, id };
}

function encodeCursor(startedAt: Date, id: string): string {
  return `${startedAt.toISOString()}_${id}`;
}

export class TimelineService {
  /**
   * Keyset-paginated unified timeline. Never uses offset/skip — pages via
   * (startedAt, id) < cursor, ordered startedAt desc, id desc.
   */
  static async getTimeline(userId: string, query: TimelineQuery) {
    const limit = Math.min(query.limit ?? 100, 300);

    const where: any = {
      userId,
      date: { gte: query.from, lte: query.to },
    };
    if (query.deviceIds && query.deviceIds.length > 0) where.deviceId = { in: query.deviceIds };
    if (query.categoryIds && query.categoryIds.length > 0) where.categoryId = { in: query.categoryIds };
    if (query.sourceTypes && query.sourceTypes.length > 0) where.sourceType = { in: query.sourceTypes };

    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      where.OR = [
        { startedAt: { lt: decoded.startedAt } },
        { startedAt: decoded.startedAt, id: { lt: decoded.id } },
      ];
    }

    const events = await prisma.unifiedEvent.findMany({
      where,
      include: { application: true, category: true, device: true },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = events.length > limit;
    const page = hasMore ? events.slice(0, limit) : events;
    const nextCursor = hasMore ? encodeCursor(page[page.length - 1].startedAt, page[page.length - 1].id) : null;

    const totalDurationSeconds = await prisma.unifiedEvent.aggregate({
      where: {
        userId,
        date: { gte: query.from, lte: query.to },
        ...(query.deviceIds && query.deviceIds.length > 0 ? { deviceId: { in: query.deviceIds } } : {}),
        ...(query.categoryIds && query.categoryIds.length > 0 ? { categoryId: { in: query.categoryIds } } : {}),
        ...(query.sourceTypes && query.sourceTypes.length > 0 ? { sourceType: { in: query.sourceTypes } } : {}),
      },
      _sum: { durationSeconds: true },
    });

    return {
      events: page.map((e) => ({
        id: e.id,
        sourceType: e.sourceType,
        eventType: e.eventType,
        application: e.application ? { id: e.application.id, name: e.application.canonicalName } : null,
        category: e.category ? { id: e.category.id, name: e.category.name } : null,
        device: e.device ? { id: e.device.id, name: e.device.name } : null,
        domain: e.domain,
        title: e.title,
        startedAt: e.startedAt,
        endedAt: e.endedAt,
        durationSeconds: e.durationSeconds,
        isDistraction: e.isDistraction,
        isIdle: e.isIdle,
        confidence: e.confidence,
      })),
      nextCursor,
      totalDurationSeconds: totalDurationSeconds._sum.durationSeconds || 0,
    };
  }

  /**
   * 24 hourly buckets for a compact day-strip visualization.
   */
  static async getDaySummary(userId: string, date: string) {
    const events = await prisma.unifiedEvent.findMany({
      where: { userId, date },
      select: {
        startedAt: true,
        durationSeconds: true,
        isDistraction: true,
        isIdle: true,
        sourceType: true,
      },
    });

    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      totalSeconds: 0,
      distractionSeconds: 0,
      idleSeconds: 0,
      eventCount: 0,
      sourceTypes: new Set<string>(),
    }));

    for (const event of events) {
      const hour = new Date(event.startedAt).getUTCHours();
      const bucket = buckets[hour];
      bucket.totalSeconds += event.durationSeconds;
      if (event.isDistraction) bucket.distractionSeconds += event.durationSeconds;
      if (event.isIdle) bucket.idleSeconds += event.durationSeconds;
      bucket.eventCount += 1;
      bucket.sourceTypes.add(event.sourceType);
    }

    return {
      date,
      hourly: buckets.map((b) => ({
        hour: b.hour,
        totalSeconds: b.totalSeconds,
        distractionSeconds: b.distractionSeconds,
        idleSeconds: b.idleSeconds,
        eventCount: b.eventCount,
        sourceTypes: Array.from(b.sourceTypes),
      })),
      totalSeconds: buckets.reduce((acc, b) => acc + b.totalSeconds, 0),
    };
  }
}
