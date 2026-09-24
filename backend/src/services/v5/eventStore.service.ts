import crypto from 'crypto';
import { prisma } from '../../config/db.js';
import { NormalizationService } from '../normalization.service.js';

export interface IncomingEvent {
  eventType: string; // APP_SESSION, DOMAIN_SESSION, SCREENSHOT_SUMMARY, IDLE, FOCUS_SESSION
  occurredAt: string | Date;
  endedAt?: string | Date;
  durationSeconds?: number;
  applicationName?: string;
  applicationId?: string;
  categoryName?: string;
  categoryId?: string;
  domain?: string;
  title?: string;
  isDistraction?: boolean;
  isIdle?: boolean;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface IngestResult {
  ingested: number;
  duplicates: number;
  failed: number;
}

function toDateSafe(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export class EventStoreService {
  /**
   * Find or create the DataSource row representing a given ingestion channel for a user.
   */
  static async getOrCreateDataSource(
    userId: string,
    sourceType: string,
    deviceId?: string | null
  ) {
    const existing = await prisma.dataSource.findFirst({
      where: { userId, sourceType, deviceId: deviceId ?? null },
    });
    if (existing) return existing;

    return prisma.dataSource.create({
      data: {
        userId,
        sourceType,
        deviceId: deviceId ?? null,
        status: 'ACTIVE',
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Ingest a batch of raw events for a user via a known DataSource. Dedupes on
   * eventHash and transforms each successfully-stored RawEvent into a UnifiedEvent.
   * Never throws — callers should treat this as best-effort/non-blocking.
   */
  static async ingest(
    userId: string,
    dataSourceId: string,
    deviceId: string | null | undefined,
    events: IncomingEvent[]
  ): Promise<IngestResult> {
    const result: IngestResult = { ingested: 0, duplicates: 0, failed: 0 };

    if (!events || events.length === 0) return result;

    const dataSource = await prisma.dataSource.findUnique({ where: { id: dataSourceId } });
    if (!dataSource || dataSource.userId !== userId) {
      result.failed = events.length;
      return result;
    }

    for (const event of events) {
      try {
        const occurredAt = toDateSafe(event.occurredAt);
        const payloadJson = JSON.stringify(event);
        const eventHash = crypto
          .createHash('sha256')
          .update(`${userId}:${dataSource.sourceType}:${deviceId ?? ''}:${occurredAt.toISOString()}:${payloadJson}`)
          .digest('hex');

        let rawEvent;
        try {
          rawEvent = await prisma.rawEvent.create({
            data: {
              userId,
              dataSourceId,
              deviceId: deviceId ?? null,
              eventHash,
              payloadJson,
              occurredAt,
              processingStatus: 'PENDING',
            },
          });
        } catch (createErr: any) {
          if (createErr?.code === 'P2002') {
            result.duplicates++;
            continue;
          }
          throw createErr;
        }

        try {
          await this.transformRawEvent(userId, rawEvent.id, deviceId ?? null, dataSource.sourceType, event);
          await prisma.rawEvent.update({
            where: { id: rawEvent.id },
            data: { processingStatus: 'PROCESSED' },
          });
          result.ingested++;
        } catch (transformErr: any) {
          await prisma.rawEvent.update({
            where: { id: rawEvent.id },
            data: {
              processingStatus: 'FAILED',
              errorMessage: String(transformErr?.message || transformErr).slice(0, 1000),
            },
          });
          result.failed++;
        }
      } catch (err) {
        console.error('EventStoreService.ingest: unexpected failure processing event', err);
        result.failed++;
      }
    }

    await prisma.dataSource.update({
      where: { id: dataSourceId },
      data: { lastSeenAt: new Date(), lastSyncAt: new Date() },
    });

    return result;
  }

  private static async transformRawEvent(
    userId: string,
    rawEventId: string,
    deviceId: string | null,
    sourceType: string,
    event: IncomingEvent
  ) {
    const occurredAt = toDateSafe(event.occurredAt);
    const endedAt = event.endedAt ? toDateSafe(event.endedAt) : undefined;

    let applicationId = event.applicationId ?? null;
    let categoryId = event.categoryId ?? null;

    if (!applicationId && event.applicationName) {
      const app = await NormalizationService.resolveApplication(event.applicationName, event.categoryName);
      applicationId = app.id;
      if (!categoryId) categoryId = app.defaultCategoryId ?? null;
    }

    if (!categoryId && event.categoryName) {
      const category = await prisma.category.findUnique({ where: { name: event.categoryName } });
      if (category) categoryId = category.id;
    }

    await prisma.unifiedEvent.create({
      data: {
        userId,
        rawEventId,
        deviceId: deviceId ?? null,
        sourceType,
        eventType: event.eventType,
        applicationId,
        categoryId,
        domain: event.domain ?? null,
        title: event.title ?? null,
        startedAt: occurredAt,
        endedAt: endedAt ?? null,
        durationSeconds: event.durationSeconds ?? 0,
        isDistraction: event.isDistraction ?? false,
        isIdle: event.isIdle ?? false,
        date: toDateKey(occurredAt),
        confidence: event.confidence ?? 1.0,
        metadataJson: JSON.stringify(event.metadata ?? {}),
      },
    });
  }

  /**
   * Adapter: mirrors a confirmed UsageRecord into the unified event store.
   * Non-blocking — callers must wrap in try/catch (this method itself also
   * never throws, it swallows and logs).
   */
  static async writeFromUsageRecord(
    userId: string,
    usageRecord: {
      id: string;
      applicationId: string;
      categoryId: string | null;
      deviceId: string | null;
      date: string;
      activeMinutes: number;
      confidence: number;
    },
    ctx: { applicationName?: string; categoryName?: string } = {}
  ) {
    try {
      const dataSource = await this.getOrCreateDataSource(userId, 'SCREENSHOT_UPLOAD', usageRecord.deviceId);

      const occurredAt = new Date(`${usageRecord.date}T12:00:00.000Z`);

      await this.ingest(userId, dataSource.id, usageRecord.deviceId, [
        {
          eventType: 'SCREENSHOT_SUMMARY',
          occurredAt,
          durationSeconds: (usageRecord.activeMinutes || 0) * 60,
          applicationId: usageRecord.applicationId,
          categoryId: usageRecord.categoryId ?? undefined,
          applicationName: ctx.applicationName,
          categoryName: ctx.categoryName,
          confidence: usageRecord.confidence,
          metadata: { usageRecordId: usageRecord.id },
        },
      ]);
    } catch (err) {
      console.error('EventStoreService.writeFromUsageRecord failed (non-blocking):', err);
    }
  }

  /**
   * Adapter: mirrors a browser-extension heartbeat into the unified event store.
   */
  static async writeFromHeartbeat(
    userId: string,
    deviceId: string | null | undefined,
    data: { domain: string; durationSeconds: number; isDistraction?: boolean; activeTabTitle?: string }
  ) {
    try {
      const dataSource = await this.getOrCreateDataSource(userId, 'BROWSER_EXTENSION', deviceId ?? null);

      await this.ingest(userId, dataSource.id, deviceId ?? null, [
        {
          eventType: 'DOMAIN_SESSION',
          occurredAt: new Date(),
          durationSeconds: data.durationSeconds,
          domain: data.domain,
          title: data.activeTabTitle,
          isDistraction: data.isDistraction ?? false,
        },
      ]);
    } catch (err) {
      console.error('EventStoreService.writeFromHeartbeat failed (non-blocking):', err);
    }
  }
}
