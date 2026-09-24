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

export interface BrowserInstanceOptions {
  /** Stable per-install identifier the extension generates once and persists locally. */
  instanceKey?: string | null;
  /** Human-readable label, e.g. "Brave on MacBook". */
  browserLabel?: string | null;
}

export class BrowserIntelligenceService {
  /**
   * Ingest a batch of tab/domain sessions from the browser extension.
   * Excluded domains (per BrowserExclusionRule) are dropped before storage —
   * they never reach RawEvent/UnifiedEvent.
   *
   * `options.instanceKey` disambiguates multiple browser installs for the
   * same user (e.g. Chrome + Brave on the same account), resolving/creating
   * a DataSource keyed on [userId, 'BROWSER_EXTENSION', instanceKey]. When
   * omitted (older V5.0 extension clients that predate this field), we fall
   * back to the original single-DataSource-per-device lookup unchanged, so
   * already-deployed clients keep working exactly as before.
   */
  static async ingestSessions(
    userId: string,
    deviceId: string | null | undefined,
    sessions: BrowserSessionInput[],
    options: BrowserInstanceOptions = {}
  ) {
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

    const instanceKey = options.instanceKey ?? undefined;
    const browserLabel = options.browserLabel ?? undefined;

    let dataSource;
    if (instanceKey) {
      dataSource = await prisma.dataSource.upsert({
        where: { userId_sourceType_instanceKey: { userId, sourceType: 'BROWSER_EXTENSION', instanceKey } },
        update: {
          lastSeenAt: new Date(),
          ...(browserLabel ? { label: browserLabel } : {}),
        },
        create: {
          userId,
          sourceType: 'BROWSER_EXTENSION',
          deviceId: deviceId ?? null,
          instanceKey,
          label: browserLabel ?? null,
          status: 'ACTIVE',
          lastSeenAt: new Date(),
        },
      });
    } else {
      // Backward-compat path: no instanceKey supplied (pre-existing deployed
      // extension clients). Unchanged from the original behavior.
      dataSource = await EventStoreService.getOrCreateDataSource(userId, 'BROWSER_EXTENSION', deviceId ?? null);
    }

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

  /**
   * Two events count as belonging to the same "browsing session" if the gap
   * between one ending and the next starting is below this threshold.
   * 5 minutes is a reasonable default — short enough to not lump together
   * distinct work blocks, long enough to absorb brief inattention gaps.
   */
  private static readonly SESSION_GAP_THRESHOLD_MS = 5 * 60 * 1000;

  static async getTabSwitchingMetrics(userId: string, { from, to }: { from?: string; to?: string } = {}) {
    const where: any = { userId, sourceType: 'BROWSER_EXTENSION', eventType: 'DOMAIN_SESSION' };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
    } else {
      // Default to a recent rolling window (last 30 days) when no range given,
      // matching the convention used elsewhere in this service.
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.date = { gte: thirtyDaysAgo.toISOString().split('T')[0] };
    }

    const events = await prisma.unifiedEvent.findMany({
      where,
      orderBy: { startedAt: 'asc' },
      take: 20000,
    });

    let totalSwitches = 0;
    const switchesPerHourMap = new Map<number, number>();
    const sessionGroups: number[][] = [];
    let currentSessionSwitches: number[] = [];
    const secondsBeforeSwitch: number[] = [];

    for (let i = 0; i < events.length; i++) {
      const curr = events[i];
      const next = events[i + 1];

      // Determine whether curr starts a new session relative to the previous event.
      if (i > 0) {
        const prev = events[i - 1];
        const prevEnd = prev.endedAt
          ? new Date(prev.endedAt).getTime()
          : new Date(prev.startedAt).getTime() + prev.durationSeconds * 1000;
        const gap = new Date(curr.startedAt).getTime() - prevEnd;
        if (gap >= this.SESSION_GAP_THRESHOLD_MS) {
          sessionGroups.push(currentSessionSwitches);
          currentSessionSwitches = [];
        }
      }

      if (next && curr.domain !== next.domain) {
        totalSwitches++;
        currentSessionSwitches.push(1);

        const hour = new Date(next.startedAt).getHours();
        switchesPerHourMap.set(hour, (switchesPerHourMap.get(hour) ?? 0) + 1);

        secondsBeforeSwitch.push(curr.durationSeconds);
      }
    }
    sessionGroups.push(currentSessionSwitches);

    const switchesPerHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      switches: switchesPerHourMap.get(hour) ?? 0,
    }));

    const sessionSwitchCounts = sessionGroups.map((g) => g.length);
    const switchesPerSession =
      sessionSwitchCounts.length > 0
        ? sessionSwitchCounts.reduce((a, b) => a + b, 0) / sessionSwitchCounts.length
        : 0;

    const avgSecondsBeforeSwitch =
      secondsBeforeSwitch.length > 0
        ? secondsBeforeSwitch.reduce((a, b) => a + b, 0) / secondsBeforeSwitch.length
        : 0;

    let peakSwitchingHour: number | null = null;
    let peakCount = 0;
    for (const entry of switchesPerHour) {
      if (entry.switches > peakCount) {
        peakCount = entry.switches;
        peakSwitchingHour = entry.hour;
      }
    }

    return {
      totalSwitches,
      switchesPerHour,
      switchesPerSession,
      avgSecondsBeforeSwitch,
      peakSwitchingHour,
    };
  }

  static async getBrowserInstances(userId: string) {
    const dataSources = await prisma.dataSource.findMany({
      where: { userId, sourceType: 'BROWSER_EXTENSION' },
      orderBy: { createdAt: 'desc' },
    });

    const instances = await Promise.all(
      dataSources.map(async (ds) => {
        const eventCount = await prisma.rawEvent.count({
          where: { dataSourceId: ds.id, processingStatus: 'PROCESSED' },
        });
        return {
          id: ds.id,
          instanceKey: ds.instanceKey,
          label: ds.label,
          status: ds.status,
          lastSyncAt: ds.lastSyncAt,
          lastSeenAt: ds.lastSeenAt,
          eventCount,
        };
      })
    );

    return instances;
  }
}
