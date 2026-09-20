import { prisma } from '../config/db.js';

export class BlockingService {
  /**
   * List all block rules for user
   */
  static async getRules(userId: string) {
    const rules = await prisma.blockRule.findMany({
      where: { userId },
      include: {
        overrides: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const activeSessions = await prisma.focusSession.findMany({
      where: { userId, status: 'IN_PROGRESS' },
    });
    const isFocusActive = activeSessions.length > 0;

    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    return rules.map((r) => {
      // Check active override
      const latestOverride = r.overrides[0];
      let isOverridden = false;
      let overrideRemainingMinutes = 0;

      if (latestOverride) {
        const overrideEnd = new Date(
          new Date(latestOverride.createdAt).getTime() + latestOverride.overrideDurationMinutes * 60 * 1000
        );
        if (overrideEnd > now) {
          isOverridden = true;
          overrideRemainingMinutes = Math.max(1, Math.ceil((overrideEnd.getTime() - now.getTime()) / 60000));
        }
      }

      // Check schedule/mode status
      let isEffectivelyBlocked = false;
      if (r.isEnabled && !isOverridden) {
        if (r.mode === 'INSTANT') {
          isEffectivelyBlocked = true;
        } else if (r.mode === 'FOCUS_ONLY') {
          isEffectivelyBlocked = isFocusActive;
        } else if (r.mode === 'SCHEDULED' && r.startTime && r.endTime) {
          if (r.startTime <= r.endTime) {
            isEffectivelyBlocked = currentTimeStr >= r.startTime && currentTimeStr <= r.endTime;
          } else {
            // crosses midnight (e.g. 22:00 to 06:00)
            isEffectivelyBlocked = currentTimeStr >= r.startTime || currentTimeStr <= r.endTime;
          }
        }
      }

      return {
        ...r,
        isEffectivelyBlocked,
        isOverridden,
        overrideRemainingMinutes,
      };
    });
  }

  /**
   * Create a new block rule
   */
  static async createRule(userId: string, data: {
    targetType?: string;
    targetValue: string;
    mode?: string;
    startTime?: string;
    endTime?: string;
    isEnabled?: boolean;
  }) {
    return prisma.blockRule.create({
      data: {
        userId,
        targetType: data.targetType || 'APP',
        targetValue: data.targetValue,
        mode: data.mode || 'INSTANT',
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        isEnabled: data.isEnabled ?? true,
      },
    });
  }

  /**
   * Update an existing block rule
   */
  static async updateRule(userId: string, ruleId: string, data: Partial<{
    targetType: string;
    targetValue: string;
    mode: string;
    startTime: string;
    endTime: string;
    isEnabled: boolean;
  }>) {
    return prisma.blockRule.updateMany({
      where: { id: ruleId, userId },
      data,
    });
  }

  /**
   * Delete block rule
   */
  static async deleteRule(userId: string, ruleId: string) {
    return prisma.blockRule.deleteMany({
      where: { id: ruleId, userId },
    });
  }

  /**
   * Log intentional override with reason and duration
   */
  static async createOverride(userId: string, data: {
    ruleId: string;
    reason: string;
    overrideDurationMinutes: number;
  }) {
    const rule = await prisma.blockRule.findFirst({
      where: { id: data.ruleId, userId },
    });

    if (!rule) throw new Error('Rule not found');

    const override = await prisma.blockOverride.create({
      data: {
        userId,
        ruleId: data.ruleId,
        reason: data.reason.trim() || 'No reason specified',
        overrideDurationMinutes: Math.min(120, Math.max(5, data.overrideDurationMinutes || 15)),
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: 'WARNING',
        title: `🔓 Temporary Override Activated: ${rule.targetValue}`,
        message: `Unlocked for ${override.overrideDurationMinutes} minutes. Reason: "${override.reason}"`,
      },
    });

    return override;
  }

  /**
   * List override history audit log
   */
  static async getOverrides(userId: string) {
    return prisma.blockOverride.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        rule: true,
      },
    });
  }
}
