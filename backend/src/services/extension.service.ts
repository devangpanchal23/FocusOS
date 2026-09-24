import { prisma } from '../config/db.js';
import { EventStoreService } from './v5/eventStore.service.js';

export class ExtensionService {
  /**
   * Returns active blocking rules and focus session status for extension
   */
  static async getExtensionConfig(userId: string) {
    const [blockRules, activeSessions, settings] = await Promise.all([
      prisma.blockRule.findMany({
        where: { userId, isEnabled: true },
        include: {
          overrides: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }),
      prisma.focusSession.findMany({
        where: {
          userId,
          status: 'IN_PROGRESS'
        },
        orderBy: { startedAt: 'desc' },
        take: 1
      }),
      prisma.userSettings.findUnique({
        where: { userId }
      })
    ]);

    const activeSession = activeSessions[0] || null;

    // Filter rules currently active (considering schedule and active session)
    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const customBlocked = blockRules.filter(rule => {
      // Check if override is currently valid (e.g. within 15 min)
      if (rule.overrides.length > 0) {
        const override = rule.overrides[0];
        const elapsedMinutes = (Date.now() - new Date(override.createdAt).getTime()) / (1000 * 60);
        if (elapsedMinutes < override.overrideDurationMinutes) {
          return false; // temporarily unblocked
        }
      }

      if (rule.mode === 'INSTANT') return true;
      if (rule.mode === 'FOCUS_ONLY') return !!activeSession;
      if (rule.mode === 'SCHEDULED' && rule.startTime && rule.endTime) {
        return currentHourMin >= rule.startTime && currentHourMin <= rule.endTime;
      }
      return true;
    }).map(r => r.targetValue.toLowerCase());

    const defaultDistractors = ['instagram', 'tiktok', 'twitter', 'x.com', 'youtube.com/shorts'];
    const effectiveBlockedDomains = Array.from(new Set([...defaultDistractors, ...customBlocked]));

    return {
      activeSession: activeSession ? {
        id: activeSession.id,
        taskName: activeSession.taskName,
        durationMinutes: activeSession.durationMinutes,
        startedAt: activeSession.startedAt
      } : null,
      blockedDomains: effectiveBlockedDomains,
      theme: settings?.theme || 'DARK',
      syncIntervalSeconds: 30
    };
  }

  /**
   * Sync telemetry heartbeat from the companion extension
   */
  static async syncHeartbeat(userId: string, data: {
    domain: string;
    durationSeconds: number;
    isDistraction?: boolean;
    activeTabTitle?: string;
  }, deviceId?: string | null) {
    const today = new Date().toISOString().split('T')[0];

    // Find or create daily metric
    const dailyMetric = await prisma.dailyMetric.upsert({
      where: {
        userId_date: { userId, date: today }
      },
      update: {
        totalScreenTimeMinutes: { increment: Math.ceil(data.durationSeconds / 60) },
        shortFormMinutes: data.isDistraction ? { increment: Math.ceil(data.durationSeconds / 60) } : undefined,
        productiveMinutes: !data.isDistraction ? { increment: Math.ceil(data.durationSeconds / 60) } : undefined
      },
      create: {
        userId,
        date: today,
        totalScreenTimeMinutes: Math.ceil(data.durationSeconds / 60),
        shortFormMinutes: data.isDistraction ? Math.ceil(data.durationSeconds / 60) : 0,
        productiveMinutes: !data.isDistraction ? Math.ceil(data.durationSeconds / 60) : 0,
        attentionScore: 75
      }
    });

    EventStoreService.writeFromHeartbeat(userId, deviceId ?? null, data).catch((err) =>
      console.error('EventStoreService.writeFromHeartbeat adapter error:', err)
    );

    return { success: true, loggedSeconds: data.durationSeconds, dailyMetricId: dailyMetric.id };
  }

  /**
   * Check if a domain should be blocked
   */
  static async evaluateDomain(userId: string, domain: string) {
    const config = await this.getExtensionConfig(userId);
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').toLowerCase();

    const isBlocked = config.blockedDomains.some(blocked => cleanDomain.includes(blocked));

    return {
      blocked: isBlocked,
      activeSession: config.activeSession,
      matchedDomain: cleanDomain
    };
  }
}
