import { prisma } from '../config/db.js';
import {
  calculateAttentionScore,
  calculateScrollCost,
  formatMinutes,
} from '../utils/durationParser.js';

export class AnalyticsService {
  /**
   * Recalculates DailyMetric for a user and date based on all confirmed UsageRecords
   */
  static async recalculateDailyMetric(userId: string, date: string) {
    const records = await prisma.usageRecord.findMany({
      where: {
        userId,
        date,
        status: 'CONFIRMED',
      },
      include: {
        category: true,
      },
    });

    let totalActive = 0;
    let totalBg = 0;
    let totalShorts = 0;
    let totalReels = 0;
    let productive = 0;
    let entertainment = 0;
    let social = 0;
    let communication = 0;
    let other = 0;

    for (const r of records) {
      totalActive += r.activeMinutes;
      totalBg += r.backgroundMinutes;
      totalShorts += r.shortsMinutes;
      totalReels += r.reelCount;

      const catName = r.category?.name || 'Other';
      if (r.category?.isProductive) {
        productive += r.activeMinutes;
      } else if (catName === 'Social Media' || catName === 'Short-form Content') {
        social += r.activeMinutes;
      } else if (catName === 'Entertainment') {
        entertainment += r.activeMinutes;
      } else if (catName === 'Communication') {
        communication += r.activeMinutes;
      } else {
        other += r.activeMinutes;
      }
    }

    const totalScreenTime = totalActive;

    // Preserve existing unlocks and notifications if any
    const existingMetric = await prisma.dailyMetric.findUnique({
      where: { userId_date: { userId, date } },
    });

    const unlocks = existingMetric?.unlockCount || 75;
    const notifications = existingMetric?.notificationCount || 532;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const target = user?.dailyTargetMinutes || 240;

    const { score } = calculateAttentionScore({
      totalScreenTimeMinutes: totalScreenTime,
      productiveMinutes: productive,
      shortFormMinutes: totalShorts,
      dailyTargetMinutes: target,
      unlocks,
      notifications,
    });

    return await prisma.dailyMetric.upsert({
      where: { userId_date: { userId, date } },
      update: {
        totalScreenTimeMinutes: totalScreenTime,
        activeMinutes: totalActive,
        backgroundMinutes: totalBg,
        shortFormMinutes: totalShorts,
        productiveMinutes: productive,
        entertainmentMinutes: entertainment,
        socialMinutes: social,
        communicationMinutes: communication,
        otherMinutes: other,
        reelCount: totalReels,
        unlockCount: unlocks,
        notificationCount: notifications,
        attentionScore: score,
        coverageStatus: records.length > 0 ? 'CONFIRMED' : 'PARTIAL',
      },
      create: {
        userId,
        date,
        totalScreenTimeMinutes: totalScreenTime,
        activeMinutes: totalActive,
        backgroundMinutes: totalBg,
        shortFormMinutes: totalShorts,
        productiveMinutes: productive,
        entertainmentMinutes: entertainment,
        socialMinutes: social,
        communicationMinutes: communication,
        otherMinutes: other,
        reelCount: totalReels,
        unlockCount: unlocks,
        notificationCount: notifications,
        attentionScore: score,
        coverageStatus: records.length > 0 ? 'CONFIRMED' : 'PARTIAL',
      },
    });
  }

  /**
   * Comprehensive daily overview for dashboard
   */
  static async getDailyOverview(userId: string, requestedDate?: string) {
    const todayStr = requestedDate || new Date().toISOString().split('T')[0];

    // Find yesterday date
    const d = new Date(todayStr);
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split('T')[0];

    const [todayMetric, yesterdayMetric, records, devices] = await Promise.all([
      prisma.dailyMetric.findUnique({ where: { userId_date: { userId, date: todayStr } } }),
      prisma.dailyMetric.findUnique({ where: { userId_date: { userId, date: yesterdayStr } } }),
      prisma.usageRecord.findMany({
        where: { userId, date: todayStr, status: 'CONFIRMED' },
        include: { application: true, category: true, device: true },
        orderBy: { activeMinutes: 'desc' },
      }),
      prisma.device.findMany({ where: { userId } }),
    ]);

    // Fallback if no metric recorded yet
    const currentScreenTime = todayMetric?.totalScreenTimeMinutes ?? 0;
    const currentShorts = todayMetric?.shortFormMinutes ?? 0;
    const currentFocus = todayMetric?.productiveMinutes ?? 0;
    const currentScore = todayMetric?.attentionScore ?? 50;
    const currentUnlocks = todayMetric?.unlockCount ?? 0;
    const currentNotifications = todayMetric?.notificationCount ?? 0;
    const currentReels = todayMetric?.reelCount ?? 0;

    // Comparisons with yesterday
    const yScreenTime = yesterdayMetric?.totalScreenTimeMinutes ?? 0;
    const yShorts = yesterdayMetric?.shortFormMinutes ?? 0;
    const yFocus = yesterdayMetric?.productiveMinutes ?? 0;

    const screenTimeDiff = currentScreenTime - yScreenTime;
    const screenTimePercent = yScreenTime > 0 ? Math.round((screenTimeDiff / yScreenTime) * 100) : 0;

    const shortsDiff = currentShorts - yShorts;
    const shortsPercent = yShorts > 0 ? Math.round((shortsDiff / yShorts) * 100) : 0;

    const focusDiff = currentFocus - yFocus;
    const focusPercent = yFocus > 0 ? Math.round((focusDiff / yFocus) * 100) : 0;

    // Attention score breakdown
    const attentionBreakdown = calculateAttentionScore({
      totalScreenTimeMinutes: currentScreenTime,
      productiveMinutes: currentFocus,
      shortFormMinutes: currentShorts,
      dailyTargetMinutes: 240,
      unlocks: currentUnlocks,
      notifications: currentNotifications,
    });

    // Scroll cost translation
    const scrollCost = calculateScrollCost(currentShorts);

    // Top apps
    const topApps = records.slice(0, 8).map((r) => ({
      id: r.id,
      name: r.application.canonicalName,
      category: r.category?.name || 'Other',
      categoryColor: r.category?.color || '#6366f1',
      activeMinutes: r.activeMinutes,
      activeFormatted: formatMinutes(r.activeMinutes),
      backgroundMinutes: r.backgroundMinutes,
      backgroundFormatted: formatMinutes(r.backgroundMinutes),
      percentage: currentScreenTime > 0 ? Math.round((r.activeMinutes / currentScreenTime) * 100) : 0,
      shortsMinutes: r.shortsMinutes,
      reelCount: r.reelCount,
      deviceName: r.device?.name || 'Unknown Device',
    }));

    // Category distribution
    const categoryMap = new Map<string, { name: string; minutes: number; color: string }>();
    for (const r of records) {
      const catName = r.category?.name || 'Other';
      const catColor = r.category?.color || '#64748b';
      const prev = categoryMap.get(catName) || { name: catName, minutes: 0, color: catColor };
      prev.minutes += r.activeMinutes;
      categoryMap.set(catName, prev);
    }
    const categoryBreakdown = Array.from(categoryMap.values())
      .sort((a, b) => b.minutes - a.minutes)
      .map((c) => ({
        ...c,
        formatted: formatMinutes(c.minutes),
        percentage: currentScreenTime > 0 ? Math.round((c.minutes / currentScreenTime) * 100) : 0,
      }));

    // Device breakdown
    const deviceMap = new Map<string, { name: string; type: string; os: string; minutes: number }>();
    for (const r of records) {
      const devName = r.device?.name || 'Other Device';
      const devType = r.device?.deviceType || 'OTHER';
      const devOs = r.device?.os || 'OTHER';
      const prev = deviceMap.get(devName) || { name: devName, type: devType, os: devOs, minutes: 0 };
      prev.minutes += r.activeMinutes;
      deviceMap.set(devName, prev);
    }
    const deviceBreakdown = Array.from(deviceMap.values()).map((d) => ({
      ...d,
      formatted: formatMinutes(d.minutes),
      percentage: currentScreenTime > 0 ? Math.round((d.minutes / currentScreenTime) * 100) : 0,
    }));

    return {
      date: todayStr,
      metrics: {
        screenTime: {
          minutes: currentScreenTime,
          formatted: formatMinutes(currentScreenTime),
          diffMinutes: screenTimeDiff,
          diffFormatted: formatMinutes(Math.abs(screenTimeDiff)),
          diffPercent: screenTimePercent,
          isHigher: screenTimeDiff > 0,
        },
        shortForm: {
          minutes: currentShorts,
          formatted: formatMinutes(currentShorts),
          reelCount: currentReels,
          diffMinutes: shortsDiff,
          diffFormatted: formatMinutes(Math.abs(shortsDiff)),
          diffPercent: shortsPercent,
          percentageOfScreenTime:
            currentScreenTime > 0 ? Math.round((currentShorts / currentScreenTime) * 100) : 0,
        },
        focusTime: {
          minutes: currentFocus,
          formatted: formatMinutes(currentFocus),
          diffMinutes: focusDiff,
          diffPercent: focusPercent,
        },
        attentionScore: {
          score: currentScore,
          breakdown: attentionBreakdown,
        },
        notifications: currentNotifications,
        unlocks: currentUnlocks,
        topApp: topApps[0] || null,
        scrollCost,
      },
      topApps,
      categoryBreakdown,
      deviceBreakdown,
      coverage: {
        status: todayMetric?.coverageStatus || 'NO_DATA',
        confidence: todayMetric?.dataConfidence || 1.0,
      },
    };
  }

  /**
   * 7-day or 30-day historical trend
   */
  static async getTrends(userId: string, days: number = 7) {
    const today = new Date();
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const metrics = await prisma.dailyMetric.findMany({
      where: {
        userId,
        date: { in: dates },
      },
      orderBy: { date: 'asc' },
    });

    const metricMap = new Map(metrics.map((m) => [m.date, m]));

    const trendData = dates.map((dateStr) => {
      const m = metricMap.get(dateStr);
      const dateObj = new Date(dateStr);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        date: dateStr,
        day: dayName,
        screenTimeMinutes: m?.totalScreenTimeMinutes ?? 0,
        screenTimeHours: +((m?.totalScreenTimeMinutes ?? 0) / 60).toFixed(1),
        shortFormMinutes: m?.shortFormMinutes ?? 0,
        shortFormHours: +((m?.shortFormMinutes ?? 0) / 60).toFixed(1),
        productiveMinutes: m?.productiveMinutes ?? 0,
        productiveHours: +((m?.productiveMinutes ?? 0) / 60).toFixed(1),
        attentionScore: m?.attentionScore ?? 50,
        reelCount: m?.reelCount ?? 0,
        hasData: !!m,
      };
    });

    const totalMinutes = trendData.reduce((acc, t) => acc + t.screenTimeMinutes, 0);
    const avgMinutes = Math.round(totalMinutes / days);
    const totalShorts = trendData.reduce((acc, t) => acc + t.shortFormMinutes, 0);
    const avgShorts = Math.round(totalShorts / days);

    return {
      days,
      trendData,
      summary: {
        totalScreenTime: formatMinutes(totalMinutes),
        avgDailyScreenTime: formatMinutes(avgMinutes),
        totalShortForm: formatMinutes(totalShorts),
        avgDailyShortForm: formatMinutes(avgShorts),
        daysWithData: metrics.length,
        dataCoverageText: `${metrics.length} of ${days} days tracked`,
      },
    };
  }
}
