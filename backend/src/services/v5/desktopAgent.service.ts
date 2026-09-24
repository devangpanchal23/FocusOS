import crypto from 'crypto';
import { prisma } from '../../config/db.js';
import { EventStoreService, IncomingEvent } from './eventStore.service.js';

const POWER_EVENT_TYPES = new Set(['SLEEP', 'WAKE', 'LOCK', 'UNLOCK']);

/**
 * Raw shape a synced event may arrive in from the desktop agent. The agent's
 * local queue (see desktop-agent/src/queue.ts) stores appName/windowTitle,
 * and an optional `type` for the V5.1 power-state events (SLEEP/WAKE/LOCK/
 * UNLOCK) alongside an optional `detectionMethod` describing how that
 * power-state was inferred. We also accept applicationName/title directly
 * so callers already speaking the IncomingEvent shape keep working.
 */
export interface RawDesktopEvent {
  occurredAt: string | Date;
  endedAt?: string | Date;
  durationSeconds?: number;
  appName?: string;
  applicationName?: string;
  windowTitle?: string;
  title?: string;
  isIdle?: boolean;
  type?: 'SLEEP' | 'WAKE' | 'LOCK' | 'UNLOCK' | string;
  detectionMethod?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface DesktopAgentSettingsInput {
  collectWindowTitles?: boolean;
  collectAppNames?: boolean;
  excludedApplications?: string[];
  excludedWindowPatterns?: string[];
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class DesktopAgentService {
  /**
   * One-time, JWT-authed device pairing. Creates a Device + DataSource and
   * returns a long-lived syncToken the agent persists locally.
   */
  static async registerDevice(
    userId: string,
    data: { name: string; os: string; timezone?: string }
  ) {
    const device = await prisma.device.create({
      data: {
        userId,
        name: data.name || 'Desktop Companion',
        deviceType: 'DESKTOP',
        os: data.os || 'OTHER',
        timezone: data.timezone || undefined,
        status: 'HEALTHY',
      },
    });

    const syncToken = crypto.randomBytes(32).toString('hex');

    const dataSource = await prisma.dataSource.create({
      data: {
        userId,
        sourceType: 'DESKTOP_AGENT',
        deviceId: device.id,
        status: 'ACTIVE',
        syncToken,
        lastSeenAt: new Date(),
      },
    });

    return { device, dataSource, syncToken };
  }

  /**
   * Find-or-create DesktopAgentSettings for a user, matching the schema
   * defaults (collectWindowTitles/collectAppNames true, empty exclusion lists).
   */
  static async getSettings(userId: string) {
    const existing = await prisma.desktopAgentSettings.findUnique({ where: { userId } });
    if (existing) return existing;

    return prisma.desktopAgentSettings.create({
      data: { userId },
    });
  }

  static async updateSettings(userId: string, data: DesktopAgentSettingsInput) {
    const updateData: Record<string, any> = {};
    const createData: Record<string, any> = { userId };

    if (data.collectWindowTitles !== undefined) {
      updateData.collectWindowTitles = data.collectWindowTitles;
      createData.collectWindowTitles = data.collectWindowTitles;
    }
    if (data.collectAppNames !== undefined) {
      updateData.collectAppNames = data.collectAppNames;
      createData.collectAppNames = data.collectAppNames;
    }
    if (data.excludedApplications !== undefined) {
      updateData.excludedApplications = JSON.stringify(data.excludedApplications);
      createData.excludedApplications = JSON.stringify(data.excludedApplications);
    }
    if (data.excludedWindowPatterns !== undefined) {
      updateData.excludedWindowPatterns = JSON.stringify(data.excludedWindowPatterns);
      createData.excludedWindowPatterns = JSON.stringify(data.excludedWindowPatterns);
    }

    return prisma.desktopAgentSettings.upsert({
      where: { userId },
      update: updateData,
      create: createData as any,
    });
  }

  /**
   * Applies user privacy settings to a batch of raw desktop events BEFORE
   * they reach EventStoreService.ingest, so redaction/exclusion happens
   * server-side regardless of what the (untrusted) agent client sends.
   *
   *  - collectWindowTitles=false: strips title/windowTitle from every event.
   *  - collectAppNames=false: rather than dropping events (which would blow
   *    a hole in the user's timeline), we bucket the app name into a stable
   *    "Unknown App" placeholder. Breaking ingestion entirely over a privacy
   *    toggle would lose duration/activity signal the user still wants
   *    (e.g. "I was active for 40min") purely because they didn't want the
   *    specific app name recorded — bucketing preserves that while still
   *    honoring the privacy intent.
   *  - excludedApplications / excludedWindowPatterns: these ARE dropped
   *    entirely (not redacted), since the user explicitly opted the whole
   *    app/window out of tracking.
   */
  private static async applyPrivacySettings(
    userId: string,
    events: RawDesktopEvent[]
  ): Promise<RawDesktopEvent[]> {
    const settings = await this.getSettings(userId);
    const excludedApplications = parseJsonArray(settings.excludedApplications).map((a) => a.toLowerCase());
    const excludedWindowPatterns = parseJsonArray(settings.excludedWindowPatterns).map((p) => p.toLowerCase());

    const result: RawDesktopEvent[] = [];

    for (const event of events) {
      const appName = (event.applicationName ?? event.appName ?? '').trim();
      const title = (event.title ?? event.windowTitle ?? '').trim();

      if (appName && excludedApplications.includes(appName.toLowerCase())) {
        continue;
      }
      if (title && excludedWindowPatterns.some((pattern) => title.toLowerCase().includes(pattern))) {
        continue;
      }

      const next: RawDesktopEvent = { ...event };

      if (!settings.collectWindowTitles) {
        delete next.title;
        delete next.windowTitle;
      }

      if (!settings.collectAppNames && appName) {
        if (next.applicationName !== undefined) next.applicationName = 'Unknown App';
        if (next.appName !== undefined) next.appName = 'Unknown App';
      }

      result.push(next);
    }

    return result;
  }

  private static toIncomingEvent(event: RawDesktopEvent): IncomingEvent {
    const type = event.type && POWER_EVENT_TYPES.has(event.type) ? event.type : undefined;

    const metadata = { ...(event.metadata ?? {}) };
    if (event.detectionMethod) {
      metadata.detectionMethod = event.detectionMethod;
    }

    return {
      eventType: type ?? 'APP_SESSION',
      occurredAt: event.occurredAt,
      endedAt: event.endedAt,
      durationSeconds: event.durationSeconds,
      applicationName: event.applicationName ?? event.appName,
      title: event.title ?? event.windowTitle,
      isIdle: event.isIdle,
      confidence: event.confidence,
      metadata,
    };
  }

  static async syncEvents(
    userId: string,
    dataSourceId: string,
    deviceId: string | null,
    events: RawDesktopEvent[]
  ) {
    const filtered = await this.applyPrivacySettings(userId, events);
    const mapped = filtered.map((e) => this.toIncomingEvent(e));
    return EventStoreService.ingest(userId, dataSourceId, deviceId, mapped);
  }

  static async getStatus(userId: string) {
    const dataSources = await prisma.dataSource.findMany({
      where: { userId, sourceType: 'DESKTOP_AGENT' },
      include: { device: true },
      orderBy: { createdAt: 'desc' },
    });

    return dataSources.map((ds) => ({
      id: ds.id,
      deviceId: ds.deviceId,
      deviceName: ds.device?.name || 'Unknown Device',
      status: ds.status,
      lastSeenAt: ds.lastSeenAt,
      lastSyncAt: ds.lastSyncAt,
    }));
  }
}
