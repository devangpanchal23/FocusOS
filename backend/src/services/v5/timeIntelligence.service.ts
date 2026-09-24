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

  /**
   * Hours of the given date where summed isDistraction=true minutes exceed
   * thresholdMinutes. Hour bucketing follows the same UTC-hour-of-startedAt
   * convention used by recomputeBaselines/detectAnomalies above.
   */
  static async getDistractionWindows(userId: string, date: string, thresholdMinutes = 20) {
    const events = await prisma.unifiedEvent.findMany({
      where: { userId, date, isDistraction: true },
      select: { startedAt: true, durationSeconds: true },
    });

    const byHour = new Map<number, number>();
    for (const event of events) {
      const hour = new Date(event.startedAt).getUTCHours();
      byHour.set(hour, (byHour.get(hour) || 0) + event.durationSeconds / 60);
    }

    return Array.from(byHour.entries())
      .filter(([, minutes]) => minutes > thresholdMinutes)
      .sort((a, b) => a[0] - b[0])
      .map(([hour, minutes]) => ({ hour, distractionMinutes: Math.round(minutes * 100) / 100 }));
  }

  /**
   * Counts app/domain context switches across the given date's chronological
   * event stream, bucketed by the hour of the later event in each switching pair.
   */
  static async getContextSwitching(userId: string, date: string) {
    const events = await prisma.unifiedEvent.findMany({
      where: { userId, date },
      select: { startedAt: true, applicationId: true, domain: true },
      orderBy: { startedAt: 'asc' },
    });

    const byHour = new Map<number, number>();
    const hoursWithActivity = new Set<number>();
    let totalSwitches = 0;

    for (let i = 0; i < events.length; i++) {
      const hour = new Date(events[i].startedAt).getUTCHours();
      hoursWithActivity.add(hour);
      if (i === 0) continue;
      const prev = events[i - 1];
      const curr = events[i];
      const switched = prev.applicationId !== curr.applicationId || prev.domain !== curr.domain;
      if (switched) {
        totalSwitches++;
        byHour.set(hour, (byHour.get(hour) || 0) + 1);
      }
    }

    const activeHours = Math.max(hoursWithActivity.size, 1);
    const switchesPerHour = Math.round((totalSwitches / activeHours) * 100) / 100;

    const byHourArr = Array.from(byHour.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, switches]) => ({ hour, switches }));

    return { totalSwitches, switchesPerHour, byHour: byHourArr };
  }

  /**
   * Shared helper for getLongSessions/getUnusualSessions: computes each
   * distinct applicationId's historical mean+stddev durationSeconds (capped
   * to the most recent 500 sessions for that user+app) and returns the
   * day's sessions annotated against that baseline.
   */
  private static async computeSessionOutliers(userId: string, date: string) {
    const dayEvents = await prisma.unifiedEvent.findMany({
      where: { userId, date, applicationId: { not: null } },
      select: { id: true, applicationId: true, durationSeconds: true },
    });
    if (dayEvents.length === 0) return [];

    const appIds = Array.from(new Set(dayEvents.map((e) => e.applicationId!)));
    const applications = await prisma.application.findMany({
      where: { id: { in: appIds } },
      select: { id: true, canonicalName: true },
    });
    const appNames = new Map(applications.map((a) => [a.id, a.canonicalName]));

    const statsByApp = new Map<string, { mean: number; stdDev: number }>();
    for (const appId of appIds) {
      const history = await prisma.unifiedEvent.findMany({
        where: { userId, applicationId: appId },
        select: { durationSeconds: true },
        orderBy: { startedAt: 'desc' },
        take: 500,
      });
      const durations = history.map((h) => h.durationSeconds);
      if (durations.length === 0) {
        statsByApp.set(appId, { mean: 0, stdDev: 0 });
        continue;
      }
      const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance = durations.reduce((a, b) => a + (b - mean) ** 2, 0) / durations.length;
      statsByApp.set(appId, { mean, stdDev: Math.sqrt(variance) });
    }

    return dayEvents.map((event) => {
      const stats = statsByApp.get(event.applicationId!) || { mean: 0, stdDev: 0 };
      return {
        eventId: event.id,
        applicationId: event.applicationId!,
        applicationName: appNames.get(event.applicationId!) || 'Unknown App',
        durationSeconds: event.durationSeconds,
        meanSeconds: Math.round(stats.mean),
        stdDevSeconds: Math.round(stats.stdDev),
      };
    });
  }

  /** Sessions from the given date whose duration exceeds that app's historical mean. */
  static async getLongSessions(userId: string, date: string) {
    const annotated = await this.computeSessionOutliers(userId, date);
    return annotated.filter((s) => s.durationSeconds > s.meanSeconds);
  }

  /** Sessions from the given date whose duration exceeds mean + 2*stddev for that app. */
  static async getUnusualSessions(userId: string, date: string) {
    const annotated = await this.computeSessionOutliers(userId, date);
    return annotated.filter((s) => s.durationSeconds > s.meanSeconds + 2 * s.stdDevSeconds);
  }

  /**
   * Average total screen-time minutes/day over the trailing 60 days, split
   * by weekday vs weekend, sourced from DailyMetric (already-aggregated
   * per-day totals, avoiding a full UnifiedEvent scan).
   */
  static async getWeekdayWeekendComparison(userId: string) {
    const fromDate = dateNDaysAgo(60);
    const metrics = await prisma.dailyMetric.findMany({
      where: { userId, date: { gte: fromDate } },
      select: { date: true, totalScreenTimeMinutes: true },
    });

    const weekday: number[] = [];
    const weekend: number[] = [];
    for (const metric of metrics) {
      const dayOfWeek = new Date(`${metric.date}T00:00:00.000Z`).getUTCDay();
      const bucket = dayOfWeek === 0 || dayOfWeek === 6 ? weekend : weekday;
      bucket.push(metric.totalScreenTimeMinutes);
    }

    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    return {
      windowDays: 60,
      weekday: { days: weekday.length, avgMinutesPerDay: Math.round(avg(weekday)) },
      weekend: { days: weekend.length, avgMinutesPerDay: Math.round(avg(weekend)) },
    };
  }

  /**
   * Finds or creates the user's TimeIntelligencePreferences row, falling
   * back to the schema's default periodsJson.
   */
  static async getPreferences(userId: string) {
    return prisma.timeIntelligencePreferences.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  /** Validates and persists a new periodsJson definition. */
  static async updatePreferences(userId: string, periodsJson: string) {
    let parsed: any;
    try {
      parsed = JSON.parse(periodsJson);
    } catch {
      throw new Error('periodsJson must be valid JSON.');
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('periodsJson must be a non-empty JSON array.');
    }
    for (const period of parsed) {
      if (
        !period ||
        typeof period.key !== 'string' ||
        typeof period.label !== 'string' ||
        typeof period.start !== 'string' ||
        typeof period.end !== 'string' ||
        !/^\d{2}:\d{2}$/.test(period.start) ||
        !/^\d{2}:\d{2}$/.test(period.end)
      ) {
        throw new Error('Each period must have {key, label, start, end} with start/end in "HH:MM" format.');
      }
    }

    return prisma.timeIntelligencePreferences.upsert({
      where: { userId },
      update: { periodsJson },
      create: { userId, periodsJson },
    });
  }

  /**
   * Buckets the given date's UnifiedEvent duration into the user's named
   * time periods (from TimeIntelligencePreferences), handling the overnight
   * wraparound case (e.g. LATE_NIGHT 22:00-05:00).
   */
  static async getPeriodBreakdown(userId: string, date: string) {
    const prefs = await this.getPreferences(userId);
    const periods: { key: string; label: string; start: string; end: string }[] = JSON.parse(prefs.periodsJson);

    const events = await prisma.unifiedEvent.findMany({
      where: { userId, date },
      select: { startedAt: true, durationSeconds: true, applicationId: true },
    });

    const [applications] = await Promise.all([
      prisma.application.findMany({ select: { id: true, canonicalName: true } }),
    ]);
    const appNames = new Map(applications.map((a) => [a.id, a.canonicalName]));

    const toMinuteOfDay = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();
    const parseHM = (hm: string) => {
      const [h, m] = hm.split(':').map((n) => parseInt(n, 10));
      return h * 60 + m;
    };

    const inPeriod = (minuteOfDay: number, startMin: number, endMin: number) => {
      if (startMin <= endMin) {
        return minuteOfDay >= startMin && minuteOfDay < endMin;
      }
      // wraps past midnight, e.g. 22:00 - 05:00
      return minuteOfDay >= startMin || minuteOfDay < endMin;
    };

    return periods.map((period) => {
      const startMin = parseHM(period.start);
      const endMin = parseHM(period.end);
      let totalSeconds = 0;
      const appMinutes = new Map<string, number>();

      for (const event of events) {
        const minuteOfDay = toMinuteOfDay(new Date(event.startedAt));
        if (!inPeriod(minuteOfDay, startMin, endMin)) continue;
        totalSeconds += event.durationSeconds;
        if (event.applicationId) {
          appMinutes.set(
            event.applicationId,
            (appMinutes.get(event.applicationId) || 0) + event.durationSeconds / 60
          );
        }
      }

      let topApp: string | null = null;
      let topAppMinutes = -1;
      for (const [appId, minutes] of appMinutes) {
        if (minutes > topAppMinutes) {
          topAppMinutes = minutes;
          topApp = appNames.get(appId) || appId;
        }
      }

      return {
        key: period.key,
        label: period.label,
        start: period.start,
        end: period.end,
        totalMinutes: Math.round((totalSeconds / 60) * 100) / 100,
        topApp,
      };
    });
  }

  /**
   * Five grounded pattern cards summarizing recent behavior. Every "evidence"
   * string is built from real query results — no fabricated numbers.
   */
  static async getPatternCards(userId: string) {
    const RECENT_DAYS = 14;
    const fromDate = dateNDaysAgo(RECENT_DAYS);

    const events = await prisma.unifiedEvent.findMany({
      where: { userId, date: { gte: fromDate }, isIdle: false },
      select: { startedAt: true, durationSeconds: true, applicationId: true, categoryId: true, date: true },
    });

    const applications = await prisma.application.findMany({ select: { id: true, canonicalName: true } });
    const appNames = new Map(applications.map((a) => [a.id, a.canonicalName]));

    const minuteOfDay = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes();
    const distinctDays = new Set(events.map((e) => e.date)).size;

    // Card 1 & 2: typical evening/morning top app.
    const buildTypicalCard = (title: string, startMin: number, endMin: number, timeRange: string) => {
      const appTotals = new Map<string, number>();
      let windowMinutes = 0;
      for (const event of events) {
        const mod = minuteOfDay(new Date(event.startedAt));
        const inWindow = startMin <= endMin ? mod >= startMin && mod < endMin : mod >= startMin || mod < endMin;
        if (!inWindow) continue;
        windowMinutes += event.durationSeconds / 60;
        if (event.applicationId) {
          appTotals.set(event.applicationId, (appTotals.get(event.applicationId) || 0) + event.durationSeconds / 60);
        }
      }
      let topAppId: string | null = null;
      let topMinutes = 0;
      for (const [appId, minutes] of appTotals) {
        if (minutes > topMinutes) {
          topMinutes = minutes;
          topAppId = appId;
        }
      }
      const topAppName = topAppId ? appNames.get(topAppId) || topAppId : null;
      return {
        title,
        timeRange,
        sourcesConsidered: distinctDays,
        metric: topAppName ? `Top app: ${topAppName}` : 'No dominant app',
        evidence: topAppName
          ? `${topAppName} accounted for ${Math.round(topMinutes)} of ${Math.round(windowMinutes)} minutes in this window across the last ${distinctDays} tracked day(s) (last ${RECENT_DAYS} days).`
          : `No UnifiedEvent activity recorded in this window over the last ${RECENT_DAYS} days.`,
      };
    };

    const eveningCard = buildTypicalCard('Typical Evening', 17 * 60, 22 * 60, '17:00-22:00');
    const morningCard = buildTypicalCard('Typical Morning', 5 * 60, 12 * 60, '05:00-12:00');

    // Card 3: highest activity named period, using the user's own preferences.
    const prefs = await this.getPreferences(userId);
    const periods: { key: string; label: string; start: string; end: string }[] = JSON.parse(prefs.periodsJson);
    const parseHM = (hm: string) => {
      const [h, m] = hm.split(':').map((n) => parseInt(n, 10));
      return h * 60 + m;
    };
    const periodTotals = periods.map((p) => {
      const startMin = parseHM(p.start);
      const endMin = parseHM(p.end);
      let minutes = 0;
      for (const event of events) {
        const mod = minuteOfDay(new Date(event.startedAt));
        const inWindow = startMin <= endMin ? mod >= startMin && mod < endMin : mod >= startMin || mod < endMin;
        if (inWindow) minutes += event.durationSeconds / 60;
      }
      return { ...p, minutes };
    });
    const topPeriod = periodTotals.reduce((best, p) => (p.minutes > best.minutes ? p : best), periodTotals[0]);
    const highestActivityCard = {
      title: 'Highest Activity Period',
      timeRange: topPeriod ? `${topPeriod.start}-${topPeriod.end}` : 'N/A',
      sourcesConsidered: distinctDays,
      metric: topPeriod ? `${topPeriod.label}: ${Math.round(topPeriod.minutes)} min` : 'No data',
      evidence: topPeriod
        ? `${topPeriod.label} (${topPeriod.start}-${topPeriod.end}) totaled ${Math.round(topPeriod.minutes)} minutes of activity across the last ${distinctDays} tracked day(s) (last ${RECENT_DAYS} days), the highest of all ${periods.length} defined periods.`
        : `No period data available over the last ${RECENT_DAYS} days.`,
    };

    // Card 4: highest switching period — sum context switches per named period across recent days.
    const recentDates = Array.from(new Set(events.map((e) => e.date))).sort();
    const switchTotalsByPeriod = new Map<string, number>(periods.map((p) => [p.key, 0]));
    for (const d of recentDates) {
      const dayEvents = events
        .filter((e) => e.date === d)
        .slice()
        .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
      for (let i = 1; i < dayEvents.length; i++) {
        const prev = dayEvents[i - 1];
        const curr = dayEvents[i];
        if (prev.applicationId !== curr.applicationId) {
          const mod = minuteOfDay(new Date(curr.startedAt));
          for (const p of periods) {
            const startMin = parseHM(p.start);
            const endMin = parseHM(p.end);
            const inWindow = startMin <= endMin ? mod >= startMin && mod < endMin : mod >= startMin || mod < endMin;
            if (inWindow) {
              switchTotalsByPeriod.set(p.key, (switchTotalsByPeriod.get(p.key) || 0) + 1);
              break;
            }
          }
        }
      }
    }
    let topSwitchKey: string | null = null;
    let topSwitchCount = -1;
    for (const [key, count] of switchTotalsByPeriod) {
      if (count > topSwitchCount) {
        topSwitchCount = count;
        topSwitchKey = key;
      }
    }
    const topSwitchPeriod = periods.find((p) => p.key === topSwitchKey);
    const highestSwitchingCard = {
      title: 'Highest Switching Period',
      timeRange: topSwitchPeriod ? `${topSwitchPeriod.start}-${topSwitchPeriod.end}` : 'N/A',
      sourcesConsidered: distinctDays,
      metric: topSwitchPeriod ? `${topSwitchPeriod.label}: ${topSwitchCount} switches` : 'No data',
      evidence:
        topSwitchPeriod && topSwitchCount > 0
          ? `${topSwitchPeriod.label} (${topSwitchPeriod.start}-${topSwitchPeriod.end}) had ${topSwitchCount} app switches summed across the last ${distinctDays} tracked day(s) (last ${RECENT_DAYS} days), more than any other period.`
          : `No app switches detected across the last ${RECENT_DAYS} days.`,
    };

    // Card 5: largest recent anomaly, grounded strictly in TimeIntelligenceAnomaly rows.
    const worstAnomaly = await prisma.timeIntelligenceAnomaly.findFirst({
      where: { userId },
      orderBy: [{ zScore: 'desc' }],
    });
    const worstAnomalyAbs = await prisma.timeIntelligenceAnomaly.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const largest = worstAnomalyAbs.reduce<typeof worstAnomalyAbs[number] | null>((best, a) => {
      if (!best || Math.abs(a.zScore) > Math.abs(best.zScore)) return a;
      return best;
    }, null) ?? worstAnomaly;

    const largestAnomalyCard = largest
      ? {
          title: 'Largest Anomaly',
          timeRange: `${largest.date} @ hour ${largest.hourOfDay}`,
          sourcesConsidered: 1,
          metric: `${largest.scopeLabel}: ${largest.direction} (z=${largest.zScore.toFixed(2)})`,
          evidence: `On ${largest.date} at hour ${largest.hourOfDay}, ${largest.scopeLabel} usage was ${Math.round(
            largest.actualMinutes
          )} min vs a baseline mean of ${Math.round(largest.baselineMean)} min (z-score ${largest.zScore.toFixed(
            2
          )}, severity ${largest.severity}).`,
        }
      : {
          title: 'Largest Anomaly',
          timeRange: 'N/A',
          sourcesConsidered: 0,
          metric: 'No anomaly data available',
          evidence: 'No TimeIntelligenceAnomaly rows exist for this user yet — run baseline/anomaly detection first.',
        };

    return [eveningCard, morningCard, highestActivityCard, highestSwitchingCard, largestAnomalyCard];
  }
}
