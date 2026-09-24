import crypto from 'node:crypto';
import { prisma } from '../config/db.js';
import { NotificationService } from './notification.service.js';

interface ConditionResult {
  triggerType: string;
  conditionOperator: string;
  thresholdValue: string;
  scopeValue?: string | null;
  actualValue: number;
  passed: boolean;
  withinTimeWindow: boolean;
}

interface ConditionInput {
  triggerType: string;
  conditionOperator: string;
  thresholdValue: string;
  scopeValue?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  orderIndex?: number;
}

interface ConditionGroupInput {
  logic: string; // AND | OR
  orderIndex?: number;
  conditions?: ConditionInput[];
  childGroups?: ConditionGroupInput[];
}

/** In-memory node used while walking a rule's AutomationConditionGroup tree. */
interface GroupTreeNode {
  id: string;
  logic: string;
  conditions: Array<{
    id: string;
    triggerType: string;
    conditionOperator: string;
    thresholdValue: string;
    scopeValue: string | null;
    timeWindowStart: string | null;
    timeWindowEnd: string | null;
  }>;
  childGroups: GroupTreeNode[];
}

interface GroupEvalResult {
  passed: boolean;
  results: ConditionResult[];
}

/**
 * Six built-in automation rule templates (Version 5.1 — §38). Keys match the
 * AutomationRuleTemplate.key comment in schema.prisma. Seeded idempotently
 * via AutomationService.seedAutomationRuleTemplates() (call once at startup —
 * not invoked automatically from this file).
 */
const AUTOMATION_RULE_TEMPLATES: Array<{
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  defaultConditions: ConditionInput[];
  defaultAction: { actionType: string; actionTarget: string };
}> = [
  {
    key: 'HIGH_SCREEN_TIME',
    name: 'High Screen Time Warning',
    description: 'Notifies you when your total daily screen time exceeds a healthy threshold.',
    category: 'Wellbeing',
    icon: 'Zap',
    defaultConditions: [
      { triggerType: 'SCREEN_TIME_LIMIT', conditionOperator: 'GREATER_THAN', thresholdValue: '240' },
    ],
    defaultAction: { actionType: 'SHOW_NOTIFICATION', actionTarget: 'Daily Screen Time' },
  },
  {
    key: 'LONG_SHORT_FORM_SESSION',
    name: 'Long Short-Form Session Alert',
    description: 'Warns you when a single short-form video binge (Reels/Shorts/TikTok) runs long.',
    category: 'Focus',
    icon: 'Video',
    defaultConditions: [
      { triggerType: 'REELS_LIMIT', conditionOperator: 'GREATER_THAN', thresholdValue: '30' },
    ],
    defaultAction: { actionType: 'SHOW_NOTIFICATION', actionTarget: 'Short-Form Video' },
  },
  {
    key: 'UNUSUAL_APP_USAGE',
    name: 'Unusual App Usage',
    description: 'Flags an app session that runs far outside your normal usage pattern for that app.',
    category: 'Insights',
    icon: 'AlertTriangle',
    defaultConditions: [
      { triggerType: 'APP_TIME_LIMIT', conditionOperator: 'GREATER_THAN', thresholdValue: '120' },
    ],
    defaultAction: { actionType: 'SHOW_NOTIFICATION', actionTarget: 'Unusual App Usage' },
  },
  {
    key: 'FOCUS_REMINDER',
    name: 'Focus Session Reminder',
    description: 'Reminds you to start a focus session once your unstructured screen time builds up.',
    category: 'Focus',
    icon: 'Timer',
    defaultConditions: [
      { triggerType: 'SCREEN_TIME_LIMIT', conditionOperator: 'GREATER_THAN', thresholdValue: '90' },
    ],
    defaultAction: { actionType: 'SHOW_NOTIFICATION', actionTarget: 'Start a Focus Session' },
  },
  {
    key: 'DEADLINE_REMINDER',
    name: 'Deadline Reminder',
    description: 'Nudges you about an approaching deadline once your productive time drops off for the day.',
    category: 'Productivity',
    icon: 'Calendar',
    defaultConditions: [
      { triggerType: 'CATEGORY_TIME_LIMIT', conditionOperator: 'LESS_THAN', thresholdValue: '30', scopeValue: 'Development' },
    ],
    defaultAction: { actionType: 'SHOW_NOTIFICATION', actionTarget: 'Upcoming Deadline' },
  },
  {
    key: 'DATA_SYNC_FAILURE',
    name: 'Data Sync Failure Alert',
    description: 'Alerts you when telemetry stops arriving from a connected device or extension.',
    category: 'System',
    icon: 'AlertOctagon',
    defaultConditions: [
      { triggerType: 'SCREEN_TIME_LIMIT', conditionOperator: 'EQUALS', thresholdValue: '0' },
    ],
    defaultAction: { actionType: 'SHOW_NOTIFICATION', actionTarget: 'Data Sync Health' },
  },
];

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
    cooldownMinutes?: number;
    conditions?: ConditionInput[];
    conditionGroups?: ConditionGroupInput[];
  }) {
    const hasGroups = Array.isArray(data.conditionGroups) && data.conditionGroups.length > 0;
    const ruleId = crypto.randomUUID();

    return prisma.automationRule.create({
      data: {
        id: ruleId,
        userId,
        name: data.name,
        triggerType: data.triggerType,
        conditionOperator: data.conditionOperator || 'GREATER_THAN',
        thresholdValue: data.thresholdValue,
        actionType: data.actionType,
        actionTarget: data.actionTarget,
        isEnabled: data.isEnabled ?? true,
        conditionLogic: hasGroups ? 'GROUPED' : (data.conditionLogic || 'SINGLE'),
        cooldownMinutes: data.cooldownMinutes ?? 0,
        ...(hasGroups
          ? {
              conditionGroups: {
                create: data.conditionGroups!.map((g, idx) => this.buildGroupCreateInput(g, idx, ruleId, true)),
              },
            }
          : data.conditionLogic === 'ALL' && Array.isArray(data.conditions)
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
      include: {
        conditions: true,
        conditionGroups: { include: { conditions: true, childGroups: true } },
      },
    });
  }

  /**
   * Recursively builds a Prisma nested-create input for one node of a
   * conditionGroups tree (used by both createRule and updateRule). `logic`
   * must be 'AND' or 'OR'; conditions/childGroups are optional at any level.
   */
  /**
   * `ruleId` must always be passed explicitly: Prisma only auto-wires the FK for the
   * immediate relation being nested through, so `AutomationCondition.ruleId` (a
   * separate required relation from `groupId`) and `AutomationConditionGroup.ruleId`
   * on a childGroup (separate from `parentGroupId`) are never inferred automatically
   * at depths beyond the first hop — they must be set on every nested create.
   * `isTopLevel` is true only for a group nested directly under
   * `AutomationRule.conditionGroups.create`, where `ruleId` IS auto-wired by that
   * relation and must be omitted (Prisma rejects an extra `ruleId` there).
   */
  private static buildGroupCreateInput(group: ConditionGroupInput, idx: number, ruleId: string, isTopLevel: boolean): any {
    return {
      ...(isTopLevel ? {} : { ruleId }),
      logic: group.logic === 'OR' ? 'OR' : 'AND',
      orderIndex: group.orderIndex ?? idx,
      ...(group.conditions && group.conditions.length > 0
        ? {
            conditions: {
              create: group.conditions.map((c, cidx) => ({
                ruleId,
                triggerType: c.triggerType,
                conditionOperator: c.conditionOperator,
                thresholdValue: c.thresholdValue,
                scopeValue: c.scopeValue,
                timeWindowStart: c.timeWindowStart,
                timeWindowEnd: c.timeWindowEnd,
                orderIndex: c.orderIndex ?? cidx,
              })),
            },
          }
        : {}),
      ...(group.childGroups && group.childGroups.length > 0
        ? {
            childGroups: {
              create: group.childGroups.map((g, gidx) => this.buildGroupCreateInput(g, gidx, ruleId, false)),
            },
          }
        : {}),
    };
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
    cooldownMinutes: number;
    conditions: ConditionInput[];
    conditionGroups: ConditionGroupInput[];
  }>) {
    const { conditions, conditionGroups, ...scalarData } = data;

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

    if (Array.isArray(conditionGroups)) {
      // Deleting root groups cascades their childGroups (self-relation "GroupNesting",
      // onDelete: Cascade); conditions that belonged to a deleted group have their
      // groupId set to null (onDelete: SetNull) rather than being deleted, so clean
      // them up explicitly to avoid orphaned rows from a previous GROUPED tree.
      const staleGroups = await prisma.automationConditionGroup.findMany({ where: { ruleId }, select: { id: true } });
      const staleGroupIds = staleGroups.map((g) => g.id);
      await prisma.automationConditionGroup.deleteMany({ where: { ruleId, parentGroupId: null } });
      if (staleGroupIds.length > 0) {
        await prisma.automationCondition.deleteMany({ where: { ruleId, groupId: { in: staleGroupIds } } });
      }

      for (let i = 0; i < conditionGroups.length; i++) {
        await prisma.automationConditionGroup.create({
          data: this.buildGroupCreateInput(conditionGroups[i], i, ruleId, false),
        });
      }
      (scalarData as any).conditionLogic = conditionGroups.length > 0 ? 'GROUPED' : (scalarData.conditionLogic || 'SINGLE');
    }

    return prisma.automationRule.updateMany({
      where: { id: ruleId, userId },
      data: scalarData,
    });
  }

  /** All built-in automation rule templates (Version 5.1 — §38). */
  static async listTemplates() {
    return prisma.automationRuleTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  /**
   * One-time idempotent seed of the 6 built-in AutomationRuleTemplate rows.
   * Upserts by unique `key`, so re-running never duplicates. NOT called
   * automatically from this file — the integrator wires a single call to
   * this into index.ts startup.
   */
  static async seedAutomationRuleTemplates() {
    for (const t of AUTOMATION_RULE_TEMPLATES) {
      const defaultConditionsJson = JSON.stringify(t.defaultConditions);
      const defaultActionJson = JSON.stringify(t.defaultAction);
      await prisma.automationRuleTemplate.upsert({
        where: { key: t.key },
        update: {
          name: t.name,
          description: t.description,
          category: t.category,
          icon: t.icon,
          defaultConditionsJson,
          defaultActionJson,
        },
        create: {
          key: t.key,
          name: t.name,
          description: t.description,
          category: t.category,
          icon: t.icon,
          defaultConditionsJson,
          defaultActionJson,
        },
      });
    }
    return { seeded: AUTOMATION_RULE_TEMPLATES.length };
  }

  /**
   * Creates a real (but disabled) AutomationRule for the user from a
   * template's default conditions/action. Always isEnabled:false so an
   * instantiated template never fires unexpectedly before the user reviews
   * and enables it.
   */
  static async instantiateTemplate(userId: string, key: string) {
    const template = await prisma.automationRuleTemplate.findUnique({ where: { key } });
    if (!template) {
      throw new Error(`Automation rule template "${key}" was not found.`);
    }

    const conditions: ConditionInput[] = JSON.parse(template.defaultConditionsJson);
    const action: { actionType: string; actionTarget: string } = JSON.parse(template.defaultActionJson);

    if (!Array.isArray(conditions) || conditions.length === 0) {
      throw new Error(`Template "${key}" has no default conditions configured.`);
    }

    const conditionLogic = conditions.length > 1 ? 'ALL' : 'SINGLE';
    const primary = conditions[0];

    return prisma.automationRule.create({
      data: {
        userId,
        name: template.name,
        triggerType: primary.triggerType,
        conditionOperator: primary.conditionOperator,
        thresholdValue: primary.thresholdValue,
        actionType: action.actionType,
        actionTarget: action.actionTarget,
        isEnabled: false,
        conditionLogic,
        ...(conditionLogic === 'ALL'
          ? {
              conditions: {
                create: conditions.map((c, idx) => ({
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
      // GROUPED (nested AND/OR condition tree) rules take their own evaluation path.
      if (rule.conditionLogic === 'GROUPED') {
        const triggered = await this.evaluateGroupedRule(userId, rule);
        if (triggered) triggeredCount++;
        continue;
      }

      // ALL (multi-condition AND-chain) rules take a separate, additive evaluation path.
      if (rule.conditionLogic === 'ALL') {
        const triggered = await this.evaluateAllConditionsRule(userId, rule);
        if (triggered) triggeredCount++;
        continue;
      }

      // SINGLE (legacy default) — existing code path, unchanged when cooldownMinutes is 0 (the default).
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
      // Version 5.1: optional per-rule cooldown (in addition to the 4h anti-spam
      // gate above). cooldownMinutes defaults to 0, so cooldownActive is always
      // false unless the user explicitly configured a cooldown for this rule.
      const cooldownMs = (rule.cooldownMinutes || 0) * 60_000;
      const cooldownActive = cooldownMs > 0 && !!rule.lastTriggeredAt && (Date.now() - rule.lastTriggeredAt.getTime()) < cooldownMs;
      if (isTriggered && !cooldownActive && (!rule.lastTriggeredAt || rule.lastTriggeredAt < fourHoursAgo)) {
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

        await this.deliverAction(userId, rule, { logMessage, actualValue, threshold: rule.thresholdValue });

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
   * Shared single-condition evaluator: computes the actual value, checks the
   * operator/threshold, and gates on the optional time window. Used by the
   * ALL path, the GROUPED path, and the dry-run testRule path so the
   * per-condition threshold/operator logic lives in exactly one place.
   */
  private static async evaluateCondition(
    userId: string,
    todayStr: string,
    condition: {
      triggerType: string;
      conditionOperator: string;
      thresholdValue: string;
      scopeValue?: string | null;
      timeWindowStart?: string | null;
      timeWindowEnd?: string | null;
    }
  ): Promise<ConditionResult> {
    const actualValue = await this.computeActualValue(userId, todayStr, condition.triggerType, condition.scopeValue);
    const threshold = parseFloat(condition.thresholdValue) || 0;
    const withinTimeWindow = this.isWithinTimeWindow(condition.timeWindowStart, condition.timeWindowEnd);
    const passed = withinTimeWindow && this.evaluateOperator(condition.conditionOperator, actualValue, threshold);

    return {
      triggerType: condition.triggerType,
      conditionOperator: condition.conditionOperator,
      thresholdValue: condition.thresholdValue,
      scopeValue: condition.scopeValue,
      actualValue,
      passed,
      withinTimeWindow,
    };
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
      results.push(await this.evaluateCondition(userId, todayStr, condition));
    }

    const allPassed = results.every((r) => r.passed);
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    // Version 5.1: optional per-rule cooldown, additive to the 4h anti-spam gate
    // below (cooldownMinutes defaults to 0, so this never blocks by default).
    const cooldownMs = (rule.cooldownMinutes || 0) * 60_000;
    const cooldownActive = cooldownMs > 0 && !!rule.lastTriggeredAt && (Date.now() - rule.lastTriggeredAt.getTime()) < cooldownMs;
    if (!allPassed || cooldownActive || (rule.lastTriggeredAt && rule.lastTriggeredAt >= fourHoursAgo)) {
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

    await this.deliverAction(userId, rule, { logMessage, results });

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
   * Loads a rule's AutomationConditionGroup tree into memory (root groups
   * have parentGroupId: null), attaching each group's own AutomationCondition
   * rows and nested childGroups, ordered by orderIndex throughout.
   */
  private static async loadGroupTree(ruleId: string): Promise<GroupTreeNode[]> {
    const [groups, conditions] = await Promise.all([
      prisma.automationConditionGroup.findMany({ where: { ruleId }, orderBy: { orderIndex: 'asc' } }),
      prisma.automationCondition.findMany({
        where: { ruleId, groupId: { not: null } },
        orderBy: { orderIndex: 'asc' },
      }),
    ]);

    const nodeMap = new Map<string, GroupTreeNode>();
    for (const g of groups) {
      nodeMap.set(g.id, { id: g.id, logic: g.logic, conditions: [], childGroups: [] });
    }
    for (const c of conditions) {
      if (c.groupId && nodeMap.has(c.groupId)) {
        nodeMap.get(c.groupId)!.conditions.push({
          id: c.id,
          triggerType: c.triggerType,
          conditionOperator: c.conditionOperator,
          thresholdValue: c.thresholdValue,
          scopeValue: c.scopeValue,
          timeWindowStart: c.timeWindowStart,
          timeWindowEnd: c.timeWindowEnd,
        });
      }
    }

    const roots: GroupTreeNode[] = [];
    for (const g of groups) {
      const node = nodeMap.get(g.id)!;
      if (g.parentGroupId && nodeMap.has(g.parentGroupId)) {
        nodeMap.get(g.parentGroupId)!.childGroups.push(node);
      } else if (!g.parentGroupId) {
        roots.push(node);
      }
    }
    return roots;
  }

  /**
   * Recursively evaluates one AutomationConditionGroup node: AND requires all
   * direct conditions AND all childGroups to pass; OR requires any of them to
   * pass. An empty group (no conditions, no children) is vacuously true for
   * AND and vacuously false for OR — mirroring Array.every/some on [].
   */
  private static async evaluateGroupTree(userId: string, todayStr: string, node: GroupTreeNode): Promise<GroupEvalResult> {
    const conditionResults = await Promise.all(
      node.conditions.map((c) => this.evaluateCondition(userId, todayStr, c))
    );
    const childResults = await Promise.all(
      node.childGroups.map((child) => this.evaluateGroupTree(userId, todayStr, child))
    );

    const allResults = [...conditionResults, ...childResults.flatMap((c) => c.results)];
    const flags = [...conditionResults.map((r) => r.passed), ...childResults.map((r) => r.passed)];
    const passed = node.logic === 'OR' ? flags.some(Boolean) : flags.every(Boolean);

    return { passed, results: allResults };
  }

  /**
   * Evaluates a conditionLogic='GROUPED' rule's full AutomationConditionGroup
   * tree (all root groups must pass — AND across roots). On overall pass,
   * gates on the optional cooldownMinutes, writes an AutomationLog (with
   * conditionSnapshotJson), updates lastTriggeredAt, and delivers the action
   * via deliverAction — mirroring the SINGLE/ALL paths.
   */
  private static async evaluateGroupedRule(userId: string, rule: any): Promise<boolean> {
    const todayStr = new Date().toISOString().split('T')[0];
    const roots = await this.loadGroupTree(rule.id);
    if (roots.length === 0) return false;

    const rootEvals = await Promise.all(roots.map((g) => this.evaluateGroupTree(userId, todayStr, g)));
    const allResults = rootEvals.flatMap((r) => r.results);
    const passed = rootEvals.every((r) => r.passed);

    const cooldownMs = (rule.cooldownMinutes || 0) * 60_000;
    const cooldownActive = cooldownMs > 0 && !!rule.lastTriggeredAt && (Date.now() - rule.lastTriggeredAt.getTime()) < cooldownMs;

    if (!passed || cooldownActive) return false;

    const logMessage = `Rule "${rule.name}" triggered: grouped condition tree evaluated true (${allResults.length} condition(s) checked). Action: ${rule.actionType} on ${rule.actionTarget}.`;

    await prisma.automationLog.create({
      data: {
        ruleId: rule.id,
        userId,
        message: logMessage,
        conditionSnapshotJson: JSON.stringify(allResults),
        triggerSource: 'SCHEDULED',
      },
    });

    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { lastTriggeredAt: new Date() },
    });

    await this.deliverAction(userId, rule, { logMessage, results: allResults });

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
          message: `${rule.actionTarget} has been restricted automatically because the grouped condition tree evaluated true.`,
        },
      });
    }

    return true;
  }

  /**
   * Action delivery (Version 5.1 — §38.3). Always attempts an IN_APP
   * notification. Attempts a real signed webhook POST if the user has an
   * enabled WebhookSubscription — SENT is only ever logged after an actual
   * 2xx HTTP response; any thrown error (network/DNS/timeout) or non-2xx
   * response is logged FAILED. EMAIL/BROWSER channels are always
   * NOT_CONFIGURED — this project has no SMTP or push infrastructure, so
   * success is never simulated for those.
   */
  static async deliverAction(
    userId: string,
    rule: { id: string; name: string },
    triggerContext: Record<string, any>
  ): Promise<void> {
    // IN_APP
    try {
      await NotificationService.create(userId, {
        type: 'AUTOMATION',
        title: rule.name,
        message: (triggerContext?.logMessage as string) || `Rule '${rule.name}' triggered`,
      });
      await prisma.automationDeliveryLog.create({
        data: { ruleId: rule.id, userId, channel: 'IN_APP', status: 'SENT' },
      });
    } catch (err: any) {
      await prisma.automationDeliveryLog.create({
        data: { ruleId: rule.id, userId, channel: 'IN_APP', status: 'FAILED', detail: String(err?.message || err).slice(0, 500) },
      });
    }

    // WEBHOOK
    const subscription = await prisma.webhookSubscription.findFirst({ where: { userId, isEnabled: true } });
    if (!subscription) {
      await prisma.automationDeliveryLog.create({
        data: { ruleId: rule.id, userId, channel: 'WEBHOOK', status: 'NOT_CONFIGURED' },
      });
    } else {
      const payload = {
        event: 'automation.triggered',
        rule: { id: rule.id, name: rule.name },
        triggerContext,
        timestamp: new Date().toISOString(),
      };
      const body = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', subscription.secret).update(body).digest('hex');

      try {
        const response = await fetch(subscription.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-FocusOS-Signature': signature },
          body,
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          await prisma.automationDeliveryLog.create({
            data: { ruleId: rule.id, userId, channel: 'WEBHOOK', status: 'SENT', detail: `HTTP ${response.status}` },
          });
        } else {
          await prisma.automationDeliveryLog.create({
            data: { ruleId: rule.id, userId, channel: 'WEBHOOK', status: 'FAILED', detail: `HTTP ${response.status}` },
          });
        }
      } catch (err: any) {
        await prisma.automationDeliveryLog.create({
          data: {
            ruleId: rule.id,
            userId,
            channel: 'WEBHOOK',
            status: 'FAILED',
            detail: String(err?.message || err || 'Webhook request failed').slice(0, 500),
          },
        });
      }
    }

    // EMAIL / BROWSER — no SMTP or push infrastructure exists in this project;
    // never simulate success for these channels.
    await prisma.automationDeliveryLog.createMany({
      data: [
        { ruleId: rule.id, userId, channel: 'EMAIL', status: 'NOT_CONFIGURED' },
        { ruleId: rule.id, userId, channel: 'BROWSER', status: 'NOT_CONFIGURED' },
      ],
    });
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
      cooldownMinutes?: number;
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
    let groupRoots: GroupTreeNode[] | null = null;
    let cooldownMinutes = 0;
    let lastTriggeredAt: Date | null = null;

    if (ruleId) {
      const rule = await prisma.automationRule.findFirst({
        where: { id: ruleId, userId },
        include: { conditions: { orderBy: { orderIndex: 'asc' } } },
      });
      if (!rule) {
        return { wouldTrigger: false, conditionResults: [], explanation: 'Rule not found.', cooldownActive: false, cooldownRemainingMs: 0 };
      }
      conditionLogic = rule.conditionLogic;
      cooldownMinutes = rule.cooldownMinutes || 0;
      lastTriggeredAt = rule.lastTriggeredAt;

      if (conditionLogic === 'GROUPED') {
        groupRoots = await this.loadGroupTree(rule.id);
      } else {
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
      }
    } else if (draftRule) {
      conditionLogic = draftRule.conditionLogic || 'SINGLE';
      cooldownMinutes = draftRule.cooldownMinutes || 0;
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
      return { wouldTrigger: false, conditionResults: [], explanation: 'No rule or draft provided.', cooldownActive: false, cooldownRemainingMs: 0 };
    }

    let results: ConditionResult[] = [];
    let wouldTrigger: boolean;
    let explanation: string;

    if (conditionLogic === 'GROUPED' && groupRoots) {
      if (groupRoots.length === 0) {
        wouldTrigger = false;
        explanation = 'No condition groups configured for this rule.';
      } else {
        const rootEvals = await Promise.all(groupRoots.map((g) => this.evaluateGroupTree(userId, todayStr, g)));
        results = rootEvals.flatMap((r) => r.results);
        wouldTrigger = rootEvals.every((r) => r.passed);
        explanation = wouldTrigger
          ? `Grouped condition tree evaluated true (${results.length} condition(s) checked across ${groupRoots.length} root group(s)) — this rule would trigger.`
          : `Grouped condition tree evaluated false (${results.length} condition(s) checked) — this rule would not trigger.`;
      }
    } else {
      for (const spec of conditionSpecs) {
        results.push(await this.evaluateCondition(userId, todayStr, spec));
      }
      wouldTrigger = results.length > 0 && results.every((r) => r.passed);
      explanation = wouldTrigger
        ? `All ${results.length} condition(s) passed — this rule would trigger.`
        : `${results.filter((r) => !r.passed).length} of ${results.length} condition(s) failed — this rule would not trigger.`;
    }

    // Cooldown is purely informational here — a dry run must never be blocked by it.
    const cooldownMs = cooldownMinutes * 60_000;
    const elapsedMs = lastTriggeredAt ? Date.now() - lastTriggeredAt.getTime() : Infinity;
    const cooldownActive = cooldownMs > 0 && elapsedMs < cooldownMs;
    const cooldownRemainingMs = cooldownActive ? Math.max(0, cooldownMs - elapsedMs) : 0;

    return { wouldTrigger, conditionResults: results, explanation, cooldownActive, cooldownRemainingMs };
  }
}
