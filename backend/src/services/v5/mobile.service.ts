import crypto from 'crypto';
import { prisma } from '../../config/db.js';
import { EventStoreService, IncomingEvent, IngestResult } from './eventStore.service.js';

const LINK_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateSixDigitCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export class MobileService {
  /**
   * JWT-authed: generates a short-lived 6-digit pairing code the mobile app
   * (future work) would exchange via /claim.
   */
  static async createLinkToken(userId: string) {
    const code = generateSixDigitCode();
    const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);

    const token = await prisma.mobileLinkToken.create({
      data: { userId, code, expiresAt },
    });

    return { code: token.code, expiresAt: token.expiresAt };
  }

  /**
   * Code-based exchange: consumes a valid, unexpired link token and returns a
   * syncToken via the same DataSource pattern as the desktop companion.
   * No mobile event-sync endpoint is built this pass — this only provisions
   * the DataSource/syncToken for future use.
   */
  static async claimLinkToken(code: string, deviceName?: string) {
    const token = await prisma.mobileLinkToken.findUnique({ where: { code } });
    if (!token) {
      throw new Error('Invalid link code.');
    }
    if (token.consumedAt) {
      throw new Error('Link code already used.');
    }
    if (token.expiresAt < new Date()) {
      throw new Error('Link code expired.');
    }

    await prisma.mobileLinkToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });

    const device = await prisma.device.create({
      data: {
        userId: token.userId,
        name: deviceName || 'Mobile App',
        deviceType: 'PHONE',
        status: 'HEALTHY',
      },
    });

    const syncToken = crypto.randomBytes(32).toString('hex');
    const dataSource = await prisma.dataSource.create({
      data: {
        userId: token.userId,
        sourceType: 'MOBILE_APP',
        deviceId: device.id,
        status: 'ACTIVE',
        syncToken,
        lastSeenAt: new Date(),
      },
    });

    return { device, dataSource, syncToken };
  }

  /**
   * X-Sync-Token authed event sync, mirroring DesktopAgentService.syncEvents.
   */
  static async syncEvents(
    userId: string,
    dataSourceId: string,
    deviceId: string | null | undefined,
    events: IncomingEvent[]
  ): Promise<IngestResult> {
    return EventStoreService.ingest(userId, dataSourceId, deviceId, events);
  }

  /**
   * Lists all MobileDevicePermission rows for a user, annotated with the
   * related DataSource's label/deviceId for display purposes.
   */
  static async getPermissions(userId: string) {
    const permissions = await prisma.mobileDevicePermission.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    const dataSourceIds = Array.from(new Set(permissions.map((p) => p.dataSourceId)));
    const dataSources = dataSourceIds.length
      ? await prisma.dataSource.findMany({ where: { id: { in: dataSourceIds } } })
      : [];
    const dataSourceById = new Map(dataSources.map((ds) => [ds.id, ds]));

    return permissions.map((p) => {
      const ds = dataSourceById.get(p.dataSourceId);
      return {
        id: p.id,
        dataSourceId: p.dataSourceId,
        permission: p.permission,
        status: p.status,
        lastCheckedAt: p.lastCheckedAt,
        source: p.source,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        dataSource: ds ? { id: ds.id, label: ds.label, deviceId: ds.deviceId, status: ds.status } : null,
      };
    });
  }

  /**
   * Upserts a MobileDevicePermission row keyed on the
   * @@unique([userId, dataSourceId, permission]) constraint.
   */
  static async upsertPermission(
    userId: string,
    data: { dataSourceId: string; permission: string; status: string; source?: string }
  ) {
    const dataSource = await prisma.dataSource.findUnique({ where: { id: data.dataSourceId } });
    if (!dataSource || dataSource.userId !== userId) {
      throw new Error('DataSource not found for this user.');
    }

    return prisma.mobileDevicePermission.upsert({
      where: {
        userId_dataSourceId_permission: {
          userId,
          dataSourceId: data.dataSourceId,
          permission: data.permission,
        },
      },
      update: {
        status: data.status,
        source: data.source ?? 'USER_REPORTED',
        lastCheckedAt: new Date(),
      },
      create: {
        userId,
        dataSourceId: data.dataSourceId,
        permission: data.permission,
        status: data.status,
        source: data.source ?? 'USER_REPORTED',
        lastCheckedAt: new Date(),
      },
    });
  }
}
