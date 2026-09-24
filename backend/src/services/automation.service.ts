import { prisma } from '../config/db.js';

interface ConditionResult {
  triggerType: string;
  conditionOperator: string;
  thresholdValue: string;
  scopeValue?: string | null;
  actualValue: number;
  passed: boolean;
  withinTimeWindow: boolean;
}

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
    conditionLogic?: string;
    conditions?: Array<{
      triggerType: string;
      conditionOperator: string;
      thresholdValue: string;
      scopeValue?: string;
      timeWindowStart?: string;
      timeWindowEnd?: string;
      orderIndex?: number;
    }>;
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
        conditionLogic: data.conditionLogic || 'SINGLE',
        ...(data.conditionLogic === 'ALL' && Array.isArray(data.conditions)
          ? {
              conditions: {
                create: data.conditions.map((c, idx) => ({
                  triggerType: c.triggerType,
                  conditionOperator: c.conditionOperator,
                  thresholdValue: c.thresholdValue,
                  scopeValue: c.scopeValue,
                  timeWindowStart: c.timeWindowStart,
                  timeWindowEnd: c.timeWindowEnd,
                  orderIndex: c.orderIndex ?? idx,
                })),
              },
            }
          : {}),
      },
      include: { conditions: true },
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
    conditionLogic: string;
    conditions: Array<{
      triggerType: string;
      conditionOperator: string;
      thresholdValue: string;
      scopeValue?: string;
      timeWindowStart?: string;
      timeWindowEnd?: string;
      orderIndex?: number;
    }>;
  }>) {
    const { conditions, ...scalarData } = data;

    const rule = await prisma.automationRule.findFirst({ where: { id: ruleId, userId } });
    if (!rule) return { count: 0 };

    if (Array.isArray(conditions)) {
      await prisma.automationCondition.deleteMany({ where: { ruleId } });
      await prisma.automationCondition.createMany({
        data: conditions.map((c, idx) => ({
          ruleId,
          triggerType: c.triggerType,
          conditionOperator: c.conditionOperator,
          thresholdValue: c.thresholdValue,
          scopeValue: c.scopeValue,
          timeWindowStart: c.timeWindowStart,
          timeWindowEnd: c.timeWindowEnd,
          orderIndex: c.orderIndex ?? idx,
        })),
      });
    }

    return prisma.automationRule.updateMany({
      where: { id: ruleId, userId },
      data: scalarData,
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
      // ALL (multi-condition AND-chain) rules take a separate, additive evaluation path.
      if (rule.conditionLogic === 'ALL') {
        const triggered = await this.evaluateAllConditionsRule(userId, rule);
        if (triggered) triggeredCount++;
        continue;
      }

      // SINGLE (legacy default) — existing code path, unchanged.
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

  /**
   * Computes the actual value (in minutes, or count) for a single condition's
   * triggerType, scoped to today. APP_TIME_LIMIT/CATEGORY_TIME_LIMIT read from
   * UnifiedEvent (the V5 unified store); the legacy trigger types read DailyMetric.
   */
  private static async computeActualValue(
    userId: string,
    todayStr: string,
    triggerType: string,
    scopeValue?: string | null
  ): Promise<number> {
    if (triggerType === 'APP_TIME_LIMIT' && scopeValue) {
      const agg = await prisma.unifiedEvent.aggregate({
        where: { userId, date: todayStr, application: { canonicalName: scopeValue } },
        _sum: { durationSeconds: true },
      });
      return (agg._sum.durationSeconds || 0) / 60;
    }
    if (triggerType === 'CATEGORY_TIME_LIMIT' && scopeValue) {
      const agg = await prisma.unifiedEvent.aggregate({
        where: { userId, date: todayStr, category: { name: scopeValue } },
        _sum: { durationSeconds: true },
      });
      return (agg._sum.durationSeconds || 0) / 60;
    }

    const todayMetric = await prisma.dailyMetric.findUnique({ where: { userId_date: { userId, date: todayStr } } });
    if (!todayMetric) return 0;

    if (triggerType === 'REELS_LIMIT') return todayMetric.shortFormMinutes;
    if (triggerType === 'SCREEN_TIME_LIMIT') return todayMetric.totalScreenTimeMinutes;
    if (triggerType === 'REEL_COUNT_LIMIT') return todayMetric.reelCount;
    return 0;
  }

  private static evaluateOperator(operator: string, actual: number, threshold: number): boolean {
    if (operator === 'GREATER_THAN') return actual > threshold;
    if (operator === 'LESS_THAN') return actual < threshold;
    if (operator === 'EQUALS') return actual === threshold;
    return false;
  }

  private static isWithinTimeWindow(timeWindowStart?: string | null, timeWindowEnd?: string | null): boolean {
    if (!timeWindowStart || !timeWindowEnd) return true;
    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return currentHourMin >= timeWindowStart && currentHourMin <= timeWindowEnd;
  }

  /**
   * Evaluates the ordered AutomationCondition[] for a conditionLogic='ALL' rule,
   * AND-combining each (plus an optional time-window gate). On overall pass,
   * writes an AutomationLog (with conditionSnapshotJson) and executes the action
   * — mirroring the SINGLE path's action-execution + 4h anti-spam gate.
   */
  private static async evaluateAllConditionsRule(userId: string, rule: any): Promise<boolean> {
    const todayStr = new Date().toISOString().split('T')[0];
    const conditions = await prisma.automationCondition.findMany({
      where: { ruleId: rule.id },
      orderBy: { orderIndex: 'asc' },
    });

    if (conditions.length === 0) return false;

    const results: ConditionResult[] = [];
    for (const condition of conditions) {
      const actualValue = await this.computeActualValue(userId, todayStr, condition.triggerType, condition.scopeValue);
      const threshold = parseFloat(condition.thresholdValue) || 0;
      const withinTimeWindow = this.isWithinTimeWindow(condition.timeWindowStart, condition.timeWindowEnd);
      const passed = withinTimeWindow && this.evaluateOperator(condition.conditionOperator, actualValue, threshold);

      results.push({
        triggerType: condition.triggerType,
        conditionOperator: condition.conditionOperator,
        thresholdValue: condition.thresholdValue,
        scopeValue: condition.scopeValue,
        actualValue,
        passed,
        withinTimeWindow,
      });
    }

    const allPassed = results.every((r) => r.passed);
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    if (!allPassed || (rule.lastTriggeredAt && rule.lastTriggeredAt >= fourHoursAgo)) {
      return false;
    }

    const logMessage = `Rule "${rule.name}" triggered: all ${results.length} conditions passed. Action: ${rule.actionType} on ${rule.actionTarget}.`;

    await prisma.automationLog.create({
      data: {
        ruleId: rule.id,
        userId,
        message: logMessage,
        conditionSnapshotJson: JSON.stringify(results),
        triggerSource: 'SCHEDULED',
      },
    });

    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { lastTriggeredAt: new Date() },
    });

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
      const existingBlock = await prisma.blockRule.findFirst({ where: { userId, targetValue: rule.actionTarget } });
      if (existingBlock) {
        await prisma.blockRule.update({ where: { id: existingBlock.id }, data: { isEnabled: true, mode: 'INSTANT' } });
      } else {
        await prisma.blockRule.create({
          data: { userId, targetType: 'APP', targetValue: rule.actionTarget, mode: 'INSTANT', isEnabled: true },
        });
      }

      await prisma.notification.create({
        data: {
          userId,
          type: 'WARNING',
          title: `🔒 Automatic App Lock: ${rule.actionTarget}`,
          message: `${rule.actionTarget} has been restricted automatically because all rule conditions were met.`,
        },
      });
    }

    return true;
  }

  /**
   * Dry run — evaluates a rule (existing by id, or an unsaved draft) without
   * writing an AutomationLog or executing the action.
   */
  static async testRule(
    userId: string,
    ruleId?: string,
    draftRule?: {
      conditionLogic?: string;
      triggerType?: string;
      conditionOperator?: string;
      thresholdValue?: string;
      conditions?: Array<{
        triggerType: string;
        conditionOperator: string;
        thresholdValue: string;
        scopeValue?: string;
        timeWindowStart?: string;
        timeWindowEnd?: string;
      }>;
    }
  ) {
    const todayStr = new Date().toISOString().split('T')[0];

    let conditionLogic = 'SINGLE';
    let conditionSpecs: Array<{
      triggerType: string;
      conditionOperator: string;
      thresholdValue: string;
      scopeValue?: string | null;
      timeWindowStart?: string | null;
      timeWindowEnd?: string | null;
    }> = [];

    if (ruleId) {
      const rule = await prisma.automationRule.findFirst({
        where: { id: ruleId, userId },
        include: { conditions: { orderBy: { orderIndex: 'asc' } } },
      });
      if (!rule) {
        return { wouldTrigger: false, conditionResults: [], explanation: 'Rule not found.' };
      }
      conditionLogic = rule.conditionLogic;
      conditionSpecs =
        rule.conditionLogic === 'ALL' && rule.conditions.length > 0
          ? rule.conditions
          : [
              {
                triggerType: rule.triggerType,
                conditionOperator: rule.conditionOperator,
                thresholdValue: rule.thresholdValue,
              },
            ];
    } else if (draftRule) {
      conditionLogic = draftRule.conditionLogic || 'SINGLE';
      conditionSpecs =
        conditionLogic === 'ALL' && Array.isArray(draftRule.conditions)
          ? draftRule.conditions
          : [
              {
                triggerType: draftRule.triggerType || '',
                conditionOperator: draftRule.conditionOperator || 'GREATER_THAN',
                thresholdValue: draftRule.thresholdValue || '0',
              },
            ];
    } else {
      return { wouldTrigger: false, conditionResults: [], explanation: 'No rule or draft provided.' };
    }

    const results: ConditionResult[] = [];
    for (const spec of conditionSpecs) {
      const actualValue = await this.computeActualValue(userId, todayStr, spec.triggerType, spec.scopeValue);
      const threshold = parseFloat(spec.thresholdValue) || 0;
      const withinTimeWindow = this.isWithinTimeWindow(spec.timeWindowStart, spec.timeWindowEnd);
      const passed = withinTimeWindow && this.evaluateOperator(spec.conditionOperator, actualValue, threshold);

      results.push({
        triggerType: spec.triggerType,
        conditionOperator: spec.conditionOperator,
        thresholdValue: spec.thresholdValue,
        scopeValue: spec.scopeValue,
        actualValue,
        passed,
        withinTimeWindow,
      });
    }

    const wouldTrigger = results.length > 0 && results.every((r) => r.passed);
    const explanation = wouldTrigger
      ? `All ${results.length} condition(s) passed — this rule would trigger.`
      : `${results.filter((r) => !r.passed).length} of ${results.length} condition(s) failed — this rule would not trigger.`;

    return { wouldTrigger, conditionResults: results, explanation };
  }
}
