import crypto from 'crypto';
import { prisma } from '../../config/db.js';

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
}
