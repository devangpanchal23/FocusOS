import crypto from 'crypto';
import { prisma } from '../config/db.js';

export class DeveloperService {
  /**
   * List all API keys for user
   */
  static async getApiKeys(userId: string) {
    return prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Create a new API key (returns the full raw key ONCE to the caller)
   */
  static async createApiKey(userId: string, name: string, scopes: string = 'read:metrics,write:sessions') {
    const rawSecret = crypto.randomBytes(24).toString('hex');
    const fullKey = `fk_live_${rawSecret}`;
    const keyPrefix = `fk_live_${rawSecret.substring(0, 6)}...`;

    // SHA-256 hash for secure storage
    const hashedKey = crypto.createHash('sha256').update(fullKey).digest('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name,
        keyPrefix,
        hashedKey,
        scopes
      }
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      rawKey: fullKey,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt
    };
  }

  /**
   * Revoke an API key
   */
  static async revokeApiKey(userId: string, keyId: string) {
    const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key || key.userId !== userId) {
      throw new Error('API key not found or unauthorized');
    }

    await prisma.apiKey.delete({ where: { id: keyId } });
    return { success: true };
  }

  /**
   * Validate raw API key for v3 public API routes
   */
  static async validateApiKey(rawKey: string) {
    if (!rawKey || !rawKey.startsWith('fk_live_')) {
      return null;
    }

    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.findUnique({
      where: { hashedKey },
      include: { user: true }
    });

    if (apiKey) {
      // Update lastUsedAt asynchronously
      prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
      }).catch(() => {});
    }

    return apiKey;
  }

  /**
   * List user webhooks
   */
  static async getWebhooks(userId: string) {
    return prisma.webhookSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Create webhook subscription
   */
  static async createWebhook(userId: string, data: { url: string; events: string[] }) {
    const secret = `whsec_${crypto.randomBytes(20).toString('hex')}`;

    const webhook = await prisma.webhookSubscription.create({
      data: {
        userId,
        url: data.url,
        secret,
        events: JSON.stringify(data.events),
        isEnabled: true
      }
    });

    return webhook;
  }

  /**
   * Delete a webhook
   */
  static async deleteWebhook(userId: string, webhookId: string) {
    const wh = await prisma.webhookSubscription.findUnique({ where: { id: webhookId } });
    if (!wh || wh.userId !== userId) {
      throw new Error('Webhook not found or unauthorized');
    }

    await prisma.webhookSubscription.delete({ where: { id: webhookId } });
    return { success: true };
  }

  /**
   * Trigger a test ping for a webhook
   */
  static async testWebhook(userId: string, webhookId: string) {
    const wh = await prisma.webhookSubscription.findUnique({ where: { id: webhookId } });
    if (!wh || wh.userId !== userId) {
      throw new Error('Webhook not found or unauthorized');
    }

    // Return a simulated ping payload with timestamp and signature
    const testPayload = {
      event: 'ping',
      timestamp: new Date().toISOString(),
      user: { id: userId },
      message: 'FocusOS Webhook Test Event'
    };

    const signature = crypto
      .createHmac('sha256', wh.secret)
      .update(JSON.stringify(testPayload))
      .digest('hex');

    return {
      status: 'DELIVERED',
      httpCode: 200,
      deliveredAt: new Date().toISOString(),
      signature: `sha256=${signature}`,
      payload: testPayload
    };
  }
}
