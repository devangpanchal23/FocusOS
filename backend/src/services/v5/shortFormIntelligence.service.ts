import { prisma } from '../../config/db.js';

// Known short-form host list. Substring/suffix match is used against
// UnifiedEvent.domain to identify short-form scrolling sessions surfaced by
// the browser extension.
const SHORT_FORM_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'instagram.com',
  'www.instagram.com',
  'facebook.com',
  'www.facebook.com',
  'snapchat.com',
  'www.snapchat.com',
];

type Platform = 'INSTAGRAM' | 'YOUTUBE' | 'SNAPCHAT' | 'FACEBOOK' | 'OTHER';

function domainToPlatform(domain: string | null | undefined): Platform {
  if (!domain) return 'OTHER';
  const d = domain.toLowerCase();
  if (d.includes('youtube.com')) return 'YOUTUBE';
  if (d.includes('instagram.com')) return 'INSTAGRAM';
  if (d.includes('facebook.com')) return 'FACEBOOK';
  if (d.includes('snapchat.com')) return 'SNAPCHAT';
  return 'OTHER';
}

/**
 * Infers a short-form platform from an application's canonical name, for the
 * daily-aggregate (UsageRecord) path where there is no domain — only an app.
 * Heuristic: substring match against the app's canonical name. Defaults to
 * OTHER when nothing recognizable is found; the record is still mirrored so
 * the aggregate totals aren't silently dropped.
 */
function appNameToPlatform(appName: string | null | undefined): Platform {
  if (!appName) return 'OTHER';
  const n = appName.toLowerCase();
  if (n.includes('youtube')) return 'YOUTUBE';
  if (n.includes('instagram')) return 'INSTAGRAM';
  if (n.includes('facebook')) return 'FACEBOOK';
  if (n.includes('snapchat') || n.includes('snap')) return 'SNAPCHAT';
  return 'OTHER';
}

const HOTSPOT_TOP_N = 5;
// Below this many SESSION_LEVEL sessions, an hour x day-of-week heatmap is too
// sparse to be meaningful (a single outlier session could dominate a cell) —
// we return insufficientData instead of a misleading matrix.
const HEATMAP_MIN_SESSIONS = 5;
// Consecutive domain-sessions separated by less than this many seconds are
// considered part of the same behavioral "loop" for detectRepeatedLoops.
const LOOP_GAP_SECONDS = 3 * 60;

export class ShortFormIntelligenceService {
  /**
   * Mirrors short-form browser sessions from UnifiedEvent (BROWSER_EXTENSION,
   * domain matches SHORT_FORM_HOSTS) into ShortFormSession as SESSION_LEVEL
   * rows. Idempotent: skips any UnifiedEvent already mirrored (tracked via
   * ShortFormSession.sourceUnifiedEventId), so repeated calls never
   * duplicate rows. Returns the count of newly created sessions.
   */
  static async syncFromBrowserEvents(userId: string): Promise<number> {
    const candidates = await prisma.unifiedEvent.findMany({
      where: {
        userId,
        sourceType: 'BROWSER_EXTENSION',
        domain: { not: null },
        OR: SHORT_FORM_HOSTS.map((host) => ({ domain: { contains: host } })),
      },
      select: {
        id: true,
        domain: true,
        startedAt: true,
        endedAt: true,
        durationSeconds: true,
        date: true,
        deviceId: true,
      },
    });

    if (candidates.length === 0) return 0;

    const candidateIds = candidates.map((c) => c.id);
    const alreadyMirrored = await prisma.shortFormSession.findMany({
      where: { sourceUnifiedEventId: { in: candidateIds } },
      select: { sourceUnifiedEventId: true },
    });
    const mirroredSet = new Set(alreadyMirrored.map((m) => m.sourceUnifiedEventId));

    const toCreate = candidates.filter((c) => !mirroredSet.has(c.id));
    if (toCreate.length === 0) return 0;

    await prisma.$transaction(
      toCreate.map((event) =>
        prisma.shortFormSession.create({
          data: {
            userId,
            deviceId: event.deviceId,
            platform: domainToPlatform(event.domain),
            startedAt: event.startedAt,
            endedAt: event.endedAt,
            durationSeconds: event.durationSeconds,
            dataQuality: 'SESSION_LEVEL',
            sourceUnifiedEventId: event.id,
            date: event.date,
          },
        })
      )
    );

    return toCreate.length;
  }

  /**
   * Mirrors UsageRecord daily aggregates (reelCount/shortsMinutes) into
   * ShortFormSession as ESTIMATED rows. Idempotent: keyed on
   * (userId, date, platform, dataQuality, deviceId) — if a matching ESTIMATED
   * row already exists for that day/platform/device it is skipped rather than
   * duplicated. Returns the count of newly created sessions.
   */
  static async syncFromDailyAggregates(userId: string): Promise<number> {
    const records = await prisma.usageRecord.findMany({
      where: {
        userId,
        OR: [{ reelCount: { gt: 0 } }, { shortsMinutes: { gt: 0 } }],
      },
      include: { application: true },
    });

    if (records.length === 0) return 0;

    let created = 0;
    for (const record of records) {
      const platform = appNameToPlatform(record.application?.canonicalName);

      const existing = await prisma.shortFormSession.findFirst({
        where: {
          userId,
          date: record.date,
          platform,
          dataQuality: 'ESTIMATED',
          deviceId: record.deviceId,
        },
      });
      if (existing) continue;

      // SYNTHETIC placeholder timestamp: UsageRecord is a daily aggregate with
      // no real time-of-day, so we anchor it at noon UTC purely so it has a
      // valid startedAt. This value must NEVER be treated as a real
      // time-of-day signal (e.g. hotspots/heatmap deliberately exclude
      // ESTIMATED rows for this reason).
      const startedAt = new Date(`${record.date}T12:00:00.000Z`);

      await prisma.shortFormSession.create({
        data: {
          userId,
          deviceId: record.deviceId,
          platform,
          startedAt,
          endedAt: null,
          durationSeconds: (record.shortsMinutes || 0) * 60,
          itemCount: record.reelCount || 0,
          dataQuality: 'ESTIMATED',
          date: record.date,
        },
      });
      created++;
    }

    return created;
  }

  /**
   * Top hour-of-day / day-of-week combinations by total scrolling minutes.
   * SESSION_LEVEL only — ESTIMATED rows carry a synthetic noon-UTC timestamp
   * that would corrupt time-of-day analysis.
   */
  static async getHotspots(userId: string) {
    const sessions = await prisma.shortFormSession.findMany({
      where: { userId, dataQuality: 'SESSION_LEVEL' },
      select: { startedAt: true, durationSeconds: true },
    });

    const buckets = new Map<string, { hour: number; dayOfWeek: number; totalSeconds: number; sessionCount: number }>();
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      const hour = d.getUTCHours();
      const dayOfWeek = d.getUTCDay();
      const key = `${dayOfWeek}_${hour}`;
      const bucket = buckets.get(key) ?? { hour, dayOfWeek, totalSeconds: 0, sessionCount: 0 };
      bucket.totalSeconds += s.durationSeconds;
      bucket.sessionCount += 1;
      buckets.set(key, bucket);
    }

    const sorted = Array.from(buckets.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
    const top = sorted.slice(0, HOTSPOT_TOP_N).map((b) => ({
      hour: b.hour,
      dayOfWeek: b.dayOfWeek,
      totalMinutes: Math.round((b.totalSeconds / 60) * 100) / 100,
      sessionCount: b.sessionCount,
    }));

    const peak = sorted[0] ?? null;

    return {
      hotspots: top,
      peak: peak
        ? { hour: peak.hour, dayOfWeek: peak.dayOfWeek, totalMinutes: Math.round((peak.totalSeconds / 60) * 100) / 100 }
        : null,
    };
  }

  /**
   * Hour(0-23) x day-of-week(0-6) matrix of total minutes, SESSION_LEVEL only.
   * Returns insufficientData:true when there are fewer than
   * HEATMAP_MIN_SESSIONS sessions total, to avoid presenting a sparse/
   * misleading matrix as a meaningful pattern.
   */
  static async getHeatmap(userId: string) {
    const sessions = await prisma.shortFormSession.findMany({
      where: { userId, dataQuality: 'SESSION_LEVEL' },
      select: { startedAt: true, durationSeconds: true },
    });

    if (sessions.length < HEATMAP_MIN_SESSIONS) {
      return { insufficientData: true, matrix: null, sessionCount: sessions.length, threshold: HEATMAP_MIN_SESSIONS };
    }

    const matrix: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      const hour = d.getUTCHours();
      const dayOfWeek = d.getUTCDay();
      matrix[dayOfWeek][hour] += s.durationSeconds / 60;
    }

    return {
      insufficientData: false,
      matrix: matrix.map((row) => row.map((v) => Math.round(v * 100) / 100)),
      sessionCount: sessions.length,
    };
  }

  /**
   * Per-platform totals across BOTH data qualities, with each row also
   * reporting its SESSION_LEVEL vs ESTIMATED minute split.
   */
  static async getPlatformComparison(userId: string, range: { from?: string; to?: string }) {
    const where: any = { userId };
    if (range.from || range.to) {
      where.date = {};
      if (range.from) where.date.gte = range.from;
      if (range.to) where.date.lte = range.to;
    }

    const sessions = await prisma.shortFormSession.findMany({
      where,
      select: { platform: true, durationSeconds: true, itemCount: true, dataQuality: true },
    });

    const byPlatform = new Map<
      string,
      { totalSeconds: number; totalSessions: number; totalItems: number; sessionLevelSeconds: number; estimatedSeconds: number }
    >();

    for (const s of sessions) {
      const row =
        byPlatform.get(s.platform) ??
        { totalSeconds: 0, totalSessions: 0, totalItems: 0, sessionLevelSeconds: 0, estimatedSeconds: 0 };
      row.totalSeconds += s.durationSeconds;
      row.totalSessions += 1;
      row.totalItems += s.itemCount ?? 0;
      if (s.dataQuality === 'SESSION_LEVEL') row.sessionLevelSeconds += s.durationSeconds;
      if (s.dataQuality === 'ESTIMATED') row.estimatedSeconds += s.durationSeconds;
      byPlatform.set(s.platform, row);
    }

    return Array.from(byPlatform.entries()).map(([platform, row]) => ({
      platform,
      totalMinutes: Math.round((row.totalSeconds / 60) * 100) / 100,
      totalSessions: row.totalSessions,
      totalItems: row.totalItems,
      sessionLevelMinutes: Math.round((row.sessionLevelSeconds / 60) * 100) / 100,
      estimatedMinutes: Math.round((row.estimatedSeconds / 60) * 100) / 100,
    }));
  }

  /**
   * Weekly totals (last ~8 weeks) per platform, both data qualities included.
   */
  static async getWeeklyPatterns(userId: string) {
    const weeksBack = 8;
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - weeksBack * 7);
    const sinceDate = since.toISOString().split('T')[0];

    const sessions = await prisma.shortFormSession.findMany({
      where: { userId, date: { gte: sinceDate } },
      select: { platform: true, durationSeconds: true, date: true },
    });

    function weekKey(dateStr: string): string {
      const d = new Date(`${dateStr}T00:00:00.000Z`);
      // ISO week start (Monday) as the bucket key.
      const day = d.getUTCDay();
      const diff = (day === 0 ? -6 : 1) - day;
      d.setUTCDate(d.getUTCDate() + diff);
      return d.toISOString().split('T')[0];
    }

    const buckets = new Map<string, Map<string, number>>(); // weekStart -> platform -> seconds
    for (const s of sessions) {
      const wk = weekKey(s.date);
      const platformMap = buckets.get(wk) ?? new Map<string, number>();
      platformMap.set(s.platform, (platformMap.get(s.platform) ?? 0) + s.durationSeconds);
      buckets.set(wk, platformMap);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, platformMap]) => ({
        weekStart,
        platforms: Array.from(platformMap.entries()).map(([platform, seconds]) => ({
          platform,
          totalMinutes: Math.round((seconds / 60) * 100) / 100,
        })),
      }));
  }

  /**
   * Monthly totals (last ~6 months) per platform, both data qualities included.
   */
  static async getMonthlyTrends(userId: string) {
    const monthsBack = 6;
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - monthsBack);
    const sinceDate = since.toISOString().split('T')[0];

    const sessions = await prisma.shortFormSession.findMany({
      where: { userId, date: { gte: sinceDate } },
      select: { platform: true, durationSeconds: true, date: true },
    });

    const buckets = new Map<string, Map<string, number>>(); // YYYY-MM -> platform -> seconds
    for (const s of sessions) {
      const month = s.date.slice(0, 7);
      const platformMap = buckets.get(month) ?? new Map<string, number>();
      platformMap.set(s.platform, (platformMap.get(s.platform) ?? 0) + s.durationSeconds);
      buckets.set(month, platformMap);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, platformMap]) => ({
        month,
        platforms: Array.from(platformMap.entries()).map(([platform, seconds]) => ({
          platform,
          totalMinutes: Math.round((seconds / 60) * 100) / 100,
        })),
      }));
  }

  /**
   * Detects repeating domain/app toggling sequences within a single day
   * (e.g. A -> B -> A -> A), where consecutive UnifiedEvent sessions are
   * considered part of the same "loop" when the gap between them is under
   * LOOP_GAP_SECONDS. Purely descriptive: reports a "detected behavioral
   * sequence" and how many times it recurred — no causal or judgmental
   * language (not "addictive"/"compulsive", just factual sequence counts).
   */
  static async detectRepeatedLoops(
    userId: string,
    date: string
  ): Promise<{ sequence: string[]; occurrences: number }[]> {
    const events = await prisma.unifiedEvent.findMany({
      where: { userId, date },
      select: { domain: true, applicationId: true, application: { select: { canonicalName: true } }, startedAt: true, endedAt: true, durationSeconds: true },
      orderBy: { startedAt: 'asc' },
    });

    if (events.length === 0) {
      return [];
    }

    // Label each session by domain (browser) or application name (desktop/mobile).
    function label(e: (typeof events)[number]): string {
      return e.domain ?? e.application?.canonicalName ?? 'unknown';
    }

    // Group consecutive events into "loop groups" separated by gaps >=
    // LOOP_GAP_SECONDS, then record the label sequence within each group.
    const groups: string[][] = [];
    let currentGroup: string[] = [];
    let prevEndedAt: Date | null = null;

    for (const e of events) {
      const startedAt = new Date(e.startedAt);
      if (prevEndedAt) {
        const gapSeconds = (startedAt.getTime() - prevEndedAt.getTime()) / 1000;
        if (gapSeconds >= LOOP_GAP_SECONDS) {
          if (currentGroup.length > 0) groups.push(currentGroup);
          currentGroup = [];
        }
      }
      currentGroup.push(label(e));
      prevEndedAt = e.endedAt ? new Date(e.endedAt) : new Date(startedAt.getTime() + e.durationSeconds * 1000);
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    // Within each group, count occurrences of each distinct A-B-A-style
    // alternating subsequence (length >= 3, at least 2 distinct labels).
    const sequenceCounts = new Map<string, { sequence: string[]; occurrences: number }>();

    for (const group of groups) {
      if (group.length < 3) continue;
      const distinct = new Set(group);
      if (distinct.size < 2) continue; // not a toggling pattern, just one label repeated

      const key = group.join(' -> ');
      const existing = sequenceCounts.get(key);
      if (existing) {
        existing.occurrences += 1;
      } else {
        sequenceCounts.set(key, { sequence: [...group], occurrences: 1 });
      }
    }

    return Array.from(sequenceCounts.values()).sort((a, b) => b.occurrences - a.occurrences);
  }
}
