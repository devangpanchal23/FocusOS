import { prisma } from '../../config/db.js';

export class SaasEnterpriseService {
  /**
   * Get SaaS Subscription Tier and Entitlements
   */
  static async getSubscription(userId: string) {
    let sub = await prisma.subscriptionTier.findUnique({
      where: { userId },
    });

    if (!sub) {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      sub = await prisma.subscriptionTier.create({
        data: {
          userId,
          planName: 'PRO',
          status: 'ACTIVE',
          currentPeriodEnd: nextMonth,
          monthlyPriceUsd: 12.0,
          featureEntitlements: JSON.stringify({
            multiAgent: true,
            workflows: true,
            simulations: true,
            integrations: true,
            enterprise: false,
          }),
          usageLimits: JSON.stringify({
            aiQueriesPerMonth: 1000,
            workflowLimit: 25,
            deviceLimit: 10,
          }),
        },
      });
    }

    const invoices = await prisma.billingInvoice.findMany({
      where: { userId },
      orderBy: { billingDate: 'desc' },
    });

    return {
      subscription: {
        ...sub,
        featureEntitlements: JSON.parse(sub.featureEntitlements),
        usageLimits: JSON.parse(sub.usageLimits),
      },
      invoices,
    };
  }

  /**
   * Change Subscription Plan (Upgrade/Downgrade)
   */
  static async changePlan(userId: string, targetPlan: string) {
    const plans: Record<string, { price: number; entitlements: any; limits: any }> = {
      FREE: {
        price: 0,
        entitlements: { multiAgent: false, workflows: false, simulations: false, integrations: false, enterprise: false },
        limits: { aiQueriesPerMonth: 50, workflowLimit: 2, deviceLimit: 1 },
      },
      PRO: {
        price: 12.0,
        entitlements: { multiAgent: true, workflows: true, simulations: true, integrations: true, enterprise: false },
        limits: { aiQueriesPerMonth: 1000, workflowLimit: 25, deviceLimit: 10 },
      },
      PREMIUM: {
        price: 24.0,
        entitlements: { multiAgent: true, workflows: true, simulations: true, integrations: true, enterprise: false, premiumAudio: true },
        limits: { aiQueriesPerMonth: 5000, workflowLimit: 100, deviceLimit: 25 },
      },
      ENTERPRISE: {
        price: 49.0,
        entitlements: { multiAgent: true, workflows: true, simulations: true, integrations: true, enterprise: true, sso: true, scim: true },
        limits: { aiQueriesPerMonth: 999999, workflowLimit: 99999, deviceLimit: 9999 },
      },
    };

    const planConfig = plans[targetPlan] || plans.PRO;
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const updated = await prisma.subscriptionTier.upsert({
      where: { userId },
      update: {
        planName: targetPlan,
        status: 'ACTIVE',
        monthlyPriceUsd: planConfig.price,
        currentPeriodEnd: nextMonth,
        featureEntitlements: JSON.stringify(planConfig.entitlements),
        usageLimits: JSON.stringify(planConfig.limits),
      },
      create: {
        userId,
        planName: targetPlan,
        status: 'ACTIVE',
        monthlyPriceUsd: planConfig.price,
        currentPeriodEnd: nextMonth,
        featureEntitlements: JSON.stringify(planConfig.entitlements),
        usageLimits: JSON.stringify(planConfig.limits),
      },
    });

    // Create billing invoice if paid tier
    if (planConfig.price > 0) {
      await prisma.billingInvoice.create({
        data: {
          userId,
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          amountUsd: planConfig.price,
          currency: 'USD',
          status: 'PAID',
          planName: `FocusOS ${targetPlan} Monthly`,
          billingDate: new Date(),
        },
      });
    }

    return {
      ...updated,
      featureEntitlements: JSON.parse(updated.featureEntitlements),
      usageLimits: JSON.parse(updated.usageLimits),
    };
  }

  /**
   * Enterprise Organization & Policies
   */
  static async getEnterpriseOverview(userId: string) {
    const orgMember = await prisma.orgMember.findFirst({
      where: { userId },
      include: {
        org: {
          include: {
            teams: true,
            policies: true,
            members: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    });

    if (!orgMember) {
      return {
        hasOrg: false,
        message: 'No enterprise organization linked to this account.',
      };
    }

    return {
      hasOrg: true,
      org: {
        id: orgMember.org.id,
        name: orgMember.org.name,
        slug: orgMember.org.slug,
        teams: orgMember.org.teams,
        membersCount: orgMember.org.members.length,
        userRole: orgMember.role,
        policies: orgMember.org.policies.map((p) => ({
          ...p,
          policyValue: JSON.parse(p.policyValueJson || '{}'),
        })),
        members: orgMember.org.members,
      },
    };
  }

  /**
   * Update Enterprise Policy
   */
  static async updateEnterprisePolicy(orgId: string, policyKey: string, policyValue: any, enforcementLevel = 'MANDATORY') {
    return prisma.enterprisePolicy.upsert({
      where: { orgId_policyKey: { orgId, policyKey } },
      update: {
        policyValueJson: JSON.stringify(policyValue),
        enforcementLevel,
      },
      create: {
        orgId,
        policyKey,
        policyValueJson: JSON.stringify(policyValue),
        enforcementLevel,
      },
    });
  }

  /**
   * AI Governance Audit Log
   */
  static async getGovernanceLogs(userId: string) {
    return prisma.aiGovernanceAudit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
  }

  /**
   * AI Memory Management: What does the AI remember?
   */
  static async getAiMemories(userId: string) {
    // Aggregates observed context, coaching profile, and historical preferences
    const [contexts, coachingProfile] = await Promise.all([
      prisma.personalContext.findMany({ where: { userId } }),
      prisma.coachingProfile.findUnique({ where: { userId } }),
    ]);

    const memories = contexts.map((c) => ({
      id: c.id,
      category: c.contextType,
      key: c.key,
      value: c.value,
      source: c.sourceType,
      confidence: c.confidence,
      evidence: c.evidence,
      updatedAt: c.updatedAt,
    }));

    if (coachingProfile) {
      memories.push({
        id: coachingProfile.id,
        category: 'COACHING_PERSONA',
        key: 'preferred_coaching_mode',
        value: `${coachingProfile.mode} mode (${coachingProfile.tone} tone)`,
        source: 'USER_PREFERENCE',
        confidence: 1.0,
        evidence: 'Selected in Coach Settings',
        updatedAt: coachingProfile.updatedAt,
      });
    }

    return memories;
  }

  /**
   * Delete or forget an AI memory item
   */
  static async forgetAiMemory(userId: string, memoryId: string) {
    await prisma.personalContext.deleteMany({
      where: { id: memoryId, userId },
    });

    await prisma.privacyAuditLog.create({
      data: {
        userId,
        action: 'AI_MEMORY_DELETED',
        details: `User explicitly cleared AI memory token ${memoryId}.`,
      },
    });

    return { success: true, memoryId };
  }
}
