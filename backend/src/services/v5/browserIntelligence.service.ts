import { prisma } from '../../config/db.js';
import { EventStoreService } from './eventStore.service.js';

export interface BrowserSessionInput {
  domain: string;
  startedAt: string | Date;
  endedAt?: string | Date;
  durationSeconds: number;
  title?: string;
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, '');
}

function matchesPattern(domain: string, pattern: string): boolean {
  const cleanPattern = pattern.trim().toLowerCase();
  if (cleanPattern.startsWith('*.')) {
    const suffix = cleanPattern.slice(1); // ".example.com"
    return domain === cleanPattern.slice(2) || domain.endsWith(suffix);
  }
  return domain === cleanPattern || domain.endsWith(`.${cleanPattern}`);
}

export class BrowserIntelligenceService {
  /**
   * Ingest a batch of tab/domain sessions from the browser extension.
   * Excluded domains (per BrowserExclusionRule) are dropped before storage —
   * they never reach RawEvent/UnifiedEvent.
   */
  static async ingestSessions(userId: string, deviceId: string | null | undefined, sessions: BrowserSessionInput[]) {
    if (!sessions || sessions.length === 0) {
      return { accepted: 0, excluded: 0, ingested: 0, duplicates: 0, failed: 0 };
    }

    const [exclusionRules, categoryRules] = await Promise.all([
      prisma.browserExclusionRule.findMany({ where: { userId, isEnabled: true } }),
      prisma.domainCategoryRule.findMany({ where: { OR: [{ userId }, { userId: null }] } }),
    ]);

    let excluded = 0;
    const accepted: BrowserSessionInput[] = [];

    for (const session of sessions) {
      const domain = normalizeDomain(session.domain);
      const isExcluded = exclusionRules.some((rule) => matchesPattern(domain, rule.domainPattern));
      if (isExcluded) {
        excluded++;
        continue;
      }
      accepted.push({ ...session, domain });
    }

    if (accepted.length === 0) {
      return { accepted: 0, excluded, ingested: 0, duplicates: 0, failed: 0 };
    }

    const dataSource = await EventStoreService.getOrCreateDataSource(userId, 'BROWSER_EXTENSION', deviceId ?? null);

    const events = accepted.map((session) => {
      const domain = session.domain;
      // Prefer a user-specific category rule over a global default.
      const userRule = categoryRules.find((r) => r.userId === userId && matchesPattern(domain, r.domainPattern));
      const globalRule = categoryRules.find((r) => r.userId === null && matchesPattern(domain, r.domainPattern));
      const matched = userRule || globalRule;

      return {
        eventType: 'DOMAIN_SESSION',
        occurredAt: session.startedAt,
        endedAt: session.endedAt,
        durationSeconds: session.durationSeconds,
        domain,
        title: session.title,
        categoryId: matched?.categoryId,
        isDistraction: matched?.isDistraction ?? false,
      };
    });

    const result = await EventStoreService.ingest(userId, dataSource.id, deviceId ?? null, events);

    return { accepted: accepted.length, excluded, ...result };
  }

  static async getDomainAnalytics(userId: string, from?: string, to?: string) {
    const where: any = { userId, sourceType: 'BROWSER_EXTENSION', eventType: 'DOMAIN_SESSION' };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
    }

    const events = await prisma.unifiedEvent.findMany({
      where,
      include: { category: true },
      orderBy: { startedAt: 'desc' },
      take: 5000,
    });

    const byDomain = new Map<
      string,
      { domain: string; totalSeconds: number; sessionCount: number; isDistraction: boolean; category: string | null }
    >();

    for (const event of events) {
      if (!event.domain) continue;
      const entry = byDomain.get(event.domain) || {
        domain: event.domain,
        totalSeconds: 0,
        sessionCount: 0,
        isDistraction: event.isDistraction,
        category: event.category?.name ?? null,
      };
      entry.totalSeconds += event.durationSeconds;
      entry.sessionCount += 1;
      byDomain.set(event.domain, entry);
    }

    const domains = Array.from(byDomain.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);

    return {
      domains,
      totalDomains: domains.length,
      totalSeconds: domains.reduce((acc, d) => acc + d.totalSeconds, 0),
    };
  }

  static async getSummary(userId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const analytics = await this.getDomainAnalytics(userId, todayStr, todayStr);
    const distractionSeconds = analytics.domains
      .filter((d) => d.isDistraction)
      .reduce((acc, d) => acc + d.totalSeconds, 0);

    return {
      date: todayStr,
      totalDomains: analytics.totalDomains,
      totalSeconds: analytics.totalSeconds,
      distractionSeconds,
      topDomains: analytics.domains.slice(0, 10),
    };
  }

  static async listExclusions(userId: string) {
    return prisma.browserExclusionRule.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  static async createExclusion(userId: string, domainPattern: string, reason?: string) {
    return prisma.browserExclusionRule.upsert({
      where: { userId_domainPattern: { userId, domainPattern: domainPattern.trim().toLowerCase() } },
      update: { isEnabled: true, reason },
      create: { userId, domainPattern: domainPattern.trim().toLowerCase(), reason, isEnabled: true },
    });
  }

  static async deleteExclusion(userId: string, id: string) {
    return prisma.browserExclusionRule.deleteMany({ where: { id, userId } });
  }

  static async listCategoryRules(userId: string) {
    return prisma.domainCategoryRule.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createCategoryRule(
    userId: string,
    data: { domainPattern: string; categoryId: string; isDistraction?: boolean }
  ) {
    return prisma.domainCategoryRule.upsert({
      where: { userId_domainPattern: { userId, domainPattern: data.domainPattern.trim().toLowerCase() } },
      update: { categoryId: data.categoryId, isDistraction: data.isDistraction ?? false },
      create: {
        userId,
        domainPattern: data.domainPattern.trim().toLowerCase(),
        categoryId: data.categoryId,
        isDistraction: data.isDistraction ?? false,
      },
    });
  }
}
