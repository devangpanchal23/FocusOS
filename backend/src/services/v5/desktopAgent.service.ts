import crypto from 'crypto';
import { prisma } from '../../config/db.js';
import { EventStoreService, IncomingEvent } from './eventStore.service.js';

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

  static async syncEvents(userId: string, dataSourceId: string, deviceId: string | null, events: IncomingEvent[]) {
    return EventStoreService.ingest(userId, dataSourceId, deviceId, events);
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
