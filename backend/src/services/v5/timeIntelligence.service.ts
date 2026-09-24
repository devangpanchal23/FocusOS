import { prisma } from '../../config/db.js';

const TRAILING_DAYS = 28;
const MIN_SAMPLE_DAYS = 7;
const Z_THRESHOLD = 2.0;
const STALE_MS = 24 * 60 * 60 * 1000;

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function severityFor(absZ: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (absZ > 3.5) return 'HIGH';
  if (absZ >= 2.5) return 'MEDIUM';
  return 'LOW';
}

export class TimeIntelligenceService {
  /**
   * Recomputes per-app and per-category, per-hour-of-day baselines from the
   * trailing 28 days of UnifiedEvent data. Requires at least 7 distinct
   * sample days for a scope/hour bucket to be written.
   */
  static async recomputeBaselines(userId: string) {
    const fromDate = dateNDaysAgo(TRAILING_DAYS);

    const events = await prisma.unifiedEvent.findMany({
      where: { userId, date: { gte: fromDate }, isIdle: false },
      select: {
        date: true,
        startedAt: true,
        durationSeconds: true,
        applicationId: true,
        categoryId: true,
      },
    });

    // scopeType|scopeId|hour -> date -> total minutes
    const buckets = new Map<string, Map<string, number>>();

    const addToBucket = (scopeType: string, scopeId: string, hour: number, date: string, minutes: number) => {
      const key = `${scopeType}|${scopeId}|${hour}`;
      if (!buckets.has(key)) buckets.set(key, new Map());
      const dayMap = buckets.get(key)!;
      dayMap.set(date, (dayMap.get(date) || 0) + minutes);
    };

    for (const event of events) {
      const hour = new Date(event.startedAt).getUTCHours();
      const minutes = event.durationSeconds / 60;
      if (event.applicationId) addToBucket('APPLICATION', event.applicationId, hour, event.date, minutes);
      if (event.categoryId) addToBucket('CATEGORY', event.categoryId, hour, event.date, minutes);
    }

    let written = 0;
    for (const [key, dayMap] of buckets) {
      const [scopeType, scopeId, hourStr] = key.split('|');
      const hourOfDay = parseInt(hourStr, 10);
      const sampleDays = dayMap.size;
      if (sampleDays < MIN_SAMPLE_DAYS) continue;

      const values = Array.from(dayMap.values());
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
      const stdDev = Math.sqrt(variance);

      await prisma.timeIntelligenceBaseline.upsert({
        where: { userId_scopeType_scopeId_hourOfDay: { userId, scopeType, scopeId, hourOfDay } },
        update: { meanMinutes: mean, stdDevMinutes: stdDev, sampleDays, computedAt: new Date() },
        create: {
          userId,
          scopeType,
          scopeId,
          hourOfDay,
          meanMinutes: mean,
          stdDevMinutes: stdDev,
          sampleDays,
          computedAt: new Date(),
        },
      });
      written++;
    }

    return { scopesWritten: written, sampleWindowDays: TRAILING_DAYS };
  }

  /**
   * Compares a given date's actual per-hour usage against baselines,
   * writing/returning TimeIntelligenceAnomaly rows for |z| >= 2.0.
   */
  static async detectAnomalies(userId: string, date: string) {
    const baselines = await prisma.timeIntelligenceBaseline.findMany({ where: { userId } });
    if (baselines.length === 0) return [];

    const events = await prisma.unifiedEvent.findMany({
      where: { userId, date, isIdle: false },
      select: { startedAt: true, durationSeconds: true, applicationId: true, categoryId: true },
    });

    const actualMap = new Map<string, number>();
    const addActual = (scopeType: string, scopeId: string, hour: number, minutes: number) => {
      const key = `${scopeType}|${scopeId}|${hour}`;
      actualMap.set(key, (actualMap.get(key) || 0) + minutes);
    };
    for (const event of events) {
      const hour = new Date(event.startedAt).getUTCHours();
      const minutes = event.durationSeconds / 60;
      if (event.applicationId) addActual('APPLICATION', event.applicationId, hour, minutes);
      if (event.categoryId) addActual('CATEGORY', event.categoryId, hour, minutes);
    }

    const [applications, categories] = await Promise.all([
      prisma.application.findMany({ select: { id: true, canonicalName: true } }),
      prisma.category.findMany({ select: { id: true, name: true } }),
    ]);
    const appNames = new Map(applications.map((a) => [a.id, a.canonicalName]));
    const catNames = new Map(categories.map((c) => [c.id, c.name]));

    // Delete any prior anomalies for this date so recompute is idempotent.
    await prisma.timeIntelligenceAnomaly.deleteMany({ where: { userId, date } });

    const anomalies = [];
    for (const baseline of baselines) {
      const key = `${baseline.scopeType}|${baseline.scopeId}|${baseline.hourOfDay}`;
      const actualMinutes = actualMap.get(key) || 0;
      if (baseline.stdDevMinutes === 0) continue;

      const zScore = (actualMinutes - baseline.meanMinutes) / baseline.stdDevMinutes;
      const absZ = Math.abs(zScore);
      if (absZ < Z_THRESHOLD) continue;

      const scopeLabel =
        baseline.scopeType === 'APPLICATION'
          ? appNames.get(baseline.scopeId) || 'Unknown App'
          : catNames.get(baseline.scopeId) || 'Unknown Category';

      const created = await prisma.timeIntelligenceAnomaly.create({
        data: {
          userId,
          date,
          scopeType: baseline.scopeType,
          scopeId: baseline.scopeId,
          scopeLabel,
          hourOfDay: baseline.hourOfDay,
          actualMinutes,
          baselineMean: baseline.meanMinutes,
          zScore,
          direction: zScore >= 0 ? 'SPIKE' : 'DROP',
          severity: severityFor(absZ),
        },
      });
      anomalies.push(created);
    }

    return anomalies;
  }

  /**
   * On-demand recompute-and-cache dashboard summary. Recomputes baselines
   * only if the most recent baseline is stale (>24h) or missing.
   */
  static async getDashboardSummary(userId: string) {
    const todayStr = new Date().toISOString().split('T')[0];

    let latestBaseline = await prisma.timeIntelligenceBaseline.findFirst({
      where: { userId },
      orderBy: { computedAt: 'desc' },
    });

    const isStale = !latestBaseline || Date.now() - latestBaseline.computedAt.getTime() > STALE_MS;
    if (isStale) {
      await this.recomputeBaselines(userId);
      latestBaseline = await prisma.timeIntelligenceBaseline.findFirst({
        where: { userId },
        orderBy: { computedAt: 'desc' },
      });
    }

    const [anomaliesToday, coverageDays, allBaselines] = await Promise.all([
      prisma.timeIntelligenceAnomaly.count({ where: { userId, date: todayStr } }).then(async (count) => {
        if (count === 0) {
          // Ensure today's anomalies are computed at least once per stale cycle.
          return (await this.detectAnomalies(userId, todayStr)).length;
        }
        return count;
      }),
      prisma.unifiedEvent.findMany({
        where: { userId, date: { gte: dateNDaysAgo(TRAILING_DAYS) } },
        select: { date: true },
        distinct: ['date'],
      }),
      prisma.timeIntelligenceBaseline.findMany({ where: { userId } }),
    ]);

    const peakHours = Array.from(
      allBaselines.reduce((map, b) => {
        map.set(b.hourOfDay, (map.get(b.hourOfDay) || 0) + b.meanMinutes);
        return map;
      }, new Map<number, number>())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, minutes]) => ({ hour, avgMinutes: Math.round(minutes) }));

    return {
      coverageDays: coverageDays.length,
      sufficientData: coverageDays.length >= MIN_SAMPLE_DAYS,
      peakHours,
      anomaliesToday,
      lastComputedAt: latestBaseline?.computedAt ?? null,
      scopesTracked: allBaselines.length,
    };
  }
}
