import { prisma } from '../config/db.js';

export class AutomationService {
  /**
   * List all user automation rules
   */
  static async getRules(userId: string) {
    return prisma.automationRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        logs: {
          orderBy: { triggeredAt: 'desc' },
          take: 3,
        },
      },
    });
  }

  /**
   * Create an automation rule
   */
  static async createRule(userId: string, data: {
    name: string;
    triggerType: string;
    conditionOperator: string;
    thresholdValue: string;
    actionType: string;
    actionTarget: string;
    isEnabled?: boolean;
  }) {
    return prisma.automationRule.create({
      data: {
        userId,
        name: data.name,
        triggerType: data.triggerType,
        conditionOperator: data.conditionOperator || 'GREATER_THAN',
        thresholdValue: data.thresholdValue,
        actionType: data.actionType,
        actionTarget: data.actionTarget,
        isEnabled: data.isEnabled ?? true,
      },
    });
  }

  /**
   * Update an automation rule
   */
  static async updateRule(userId: string, ruleId: string, data: Partial<{
    name: string;
    triggerType: string;
    conditionOperator: string;
    thresholdValue: string;
    actionType: string;
    actionTarget: string;
    isEnabled: boolean;
  }>) {
    return prisma.automationRule.updateMany({
      where: { id: ruleId, userId },
      data,
    });
  }

  /**
   * Delete an automation rule
   */
  static async deleteRule(userId: string, ruleId: string) {
    return prisma.automationRule.deleteMany({
      where: { id: ruleId, userId },
    });
  }

  /**
   * Get execution audit logs for user's automation rules
   */
  static async getLogs(userId: string, limit: number = 50) {
    return prisma.automationLog.findMany({
      where: { userId },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
      include: { rule: true },
    });
  }

  /**
   * Evaluates active rules against latest user usage & metrics
   */
  static async evaluateRules(userId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const [rules, todayMetric] = await Promise.all([
      prisma.automationRule.findMany({ where: { userId, isEnabled: true } }),
      prisma.dailyMetric.findUnique({ where: { userId_date: { userId, date: todayStr } } }),
    ]);

    if (!todayMetric || rules.length === 0) return { evaluated: rules.length, triggered: 0 };

    let triggeredCount = 0;

    for (const rule of rules) {
      let isTriggered = false;
      let actualValue = 0;
      const targetThreshold = parseFloat(rule.thresholdValue) || 0;

      if (rule.triggerType === 'REELS_LIMIT') {
        actualValue = todayMetric.shortFormMinutes;
        isTriggered = actualValue >= targetThreshold;
      } else if (rule.triggerType === 'SCREEN_TIME_LIMIT') {
        actualValue = todayMetric.totalScreenTimeMinutes;
        isTriggered = actualValue >= targetThreshold;
      } else if (rule.triggerType === 'REEL_COUNT_LIMIT') {
        actualValue = todayMetric.reelCount;
        isTriggered = actualValue >= targetThreshold;
      }

      // Check if already triggered within the last 4 hours to avoid spamming
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      if (isTriggered && (!rule.lastTriggeredAt || rule.lastTriggeredAt < fourHoursAgo)) {
        triggeredCount++;

        const logMessage = `Rule "${rule.name}" triggered: value was ${actualValue} (threshold was ${rule.thresholdValue}). Action: ${rule.actionType} on ${rule.actionTarget}.`;

        await prisma.automationLog.create({
          data: {
            ruleId: rule.id,
            userId,
            message: logMessage,
          },
        });

        await prisma.automationRule.update({
          where: { id: rule.id },
          data: { lastTriggeredAt: new Date() },
        });

        // Execute actions
        if (rule.actionType === 'SHOW_NOTIFICATION' || rule.actionType === 'WARN') {
          await prisma.notification.create({
            data: {
              userId,
              type: 'LIMIT',
              title: `⚠️ Rule Triggered: ${rule.name}`,
              message: logMessage,
            },
          });
        } else if (rule.actionType === 'BLOCK_APP') {
          // Enable or create a block rule for the target
          const existingBlock = await prisma.blockRule.findFirst({
            where: { userId, targetValue: rule.actionTarget },
          });

          if (existingBlock) {
            await prisma.blockRule.update({
              where: { id: existingBlock.id },
              data: { isEnabled: true, mode: 'INSTANT' },
            });
          } else {
            await prisma.blockRule.create({
              data: {
                userId,
                targetType: 'APP',
                targetValue: rule.actionTarget,
                mode: 'INSTANT',
                isEnabled: true,
              },
            });
          }

          await prisma.notification.create({
            data: {
              userId,
              type: 'WARNING',
              title: `🔒 Automatic App Lock: ${rule.actionTarget}`,
              message: `${rule.actionTarget} has been restricted automatically because limit (${rule.thresholdValue}m) was exceeded.`,
            },
          });
        }
      }
    }

    return { evaluated: rules.length, triggered: triggeredCount };
  }
}
