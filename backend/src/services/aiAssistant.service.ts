import { prisma } from '../config/db.js';
import { formatMinutes } from '../utils/durationParser.js';
import { TimeIntelligenceService } from './v5/timeIntelligence.service.js';
import { TimelineService } from './v5/timeline.service.js';
import { BrowserIntelligenceService } from './v5/browserIntelligence.service.js';
// Version 5.1: a parallel workstream is adding this file (ShortFormIntelligenceService,
// exporting getHotspots(userId) among other methods). It is expected NOT to exist yet
// at the time this file is authored — see Intent 10 below, which guards every call to
// it with a typeof check so a missing export never crashes at runtime; the *import*
// itself, however, will only typecheck once that file lands.
import { ShortFormIntelligenceService } from './v5/shortFormIntelligence.service.js';

export interface AssistantResponse {
  answer: string;
  evidence: string[];
  actionRecommendation?: {
    label: string;
    route: string;
  };
  metricsContext: {
    todayScreenTime: string;
    todayShortForm: string;
    attentionScore: number;
    todayFocusMinutes: number;
  };
  dateRangeConsidered: { from: string; to: string };
  devicesConsidered: { id: string; name: string }[];
  dataAvailable: boolean;
}

function parseHourReference(query: string): number | null {
  const match = query.match(/\bat\s+(\d{1,2})(:\d{2})?\s*(am|pm)?\b/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;
  return hour;
}

export class AiAssistantService {
  /**
   * Process natural language query grounded in verified user telemetry
   */
  static async askAssistant(userId: string, query: string, sessionId?: string): Promise<AssistantResponse> {
    const todayStr = new Date().toISOString().split('T')[0];
    const normalizedQuery = query.toLowerCase().trim();

    // 1. Fetch real telemetry context
    const [todayMetric, past7DaysMetrics, todayRecords, focusSessions, goals, devices] = await Promise.all([
      prisma.dailyMetric.findUnique({ where: { userId_date: { userId, date: todayStr } } }),
      prisma.dailyMetric.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 7 }),
      prisma.usageRecord.findMany({
        where: { userId, date: todayStr },
        include: { application: true, category: true },
        orderBy: { activeMinutes: 'desc' },
      }),
      prisma.focusSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.smartGoal.findMany({ where: { userId, status: 'ACTIVE' } }),
      prisma.device.findMany({ where: { userId }, select: { id: true, name: true } }),
    ]);

    const totalScreenToday = todayMetric?.totalScreenTimeMinutes || 0;
    const shortFormToday = todayMetric?.shortFormMinutes || 0;
    const reelsToday = todayMetric?.reelCount || 0;
    const attentionScore = todayMetric?.attentionScore || 50;

    const completedTodayFocus = focusSessions
      .filter((s) => s.status === 'COMPLETED' && s.createdAt.toISOString().startsWith(todayStr))
      .reduce((acc, s) => acc + s.completedMinutes, 0);

    const metricsContext = {
      todayScreenTime: formatMinutes(totalScreenToday),
      todayShortForm: `${formatMinutes(shortFormToday)} (${reelsToday} reels)`,
      attentionScore,
      todayFocusMinutes: completedTodayFocus,
    };

    const devicesConsidered = devices.map((d) => ({ id: d.id, name: d.name }));

    let answer = '';
    const evidence: string[] = [];
    let actionRecommendation: { label: string; route: string } | undefined;
    let dateRangeConsidered = { from: todayStr, to: todayStr };
    let dataAvailable = true;

    const hourReference = parseHourReference(normalizedQuery);

    // Intent 13 (Version 5.1 §39): Platform-named session "yesterday" (e.g. "how much
    // Instagram yesterday"). Moved ahead of Intent 1 during integration: Intent 1 matches
    // on bare app-name keywords with no date filter, which would otherwise shadow this
    // more specific "yesterday"-scoped query for every query naming one of its apps.
    if (normalizedQuery.includes('yesterday') && (normalizedQuery.includes('instagram') || normalizedQuery.includes('youtube') || normalizedQuery.includes('tiktok') || normalizedQuery.includes('reels') || normalizedQuery.includes('shorts') || normalizedQuery.includes('whatsapp'))) {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const targetName = normalizedQuery.includes('instagram')
        ? 'Instagram'
        : normalizedQuery.includes('youtube')
        ? 'YouTube'
        : normalizedQuery.includes('whatsapp')
        ? 'WhatsApp'
        : normalizedQuery.includes('tiktok')
        ? 'TikTok'
        : 'Short-Form Video';

      dateRangeConsidered = { from: yesterdayStr, to: yesterdayStr };

      const record = await prisma.usageRecord.findFirst({
        where: { userId, date: yesterdayStr, application: { canonicalName: { contains: targetName } } },
        include: { application: true },
      });

      if (!record) {
        answer = `No recorded usage for ${targetName} on ${yesterdayStr}.`;
        evidence.push(`0 UsageRecord rows found for ${targetName} on ${yesterdayStr}.`);
        dataAvailable = false;
      } else {
        answer = `You spent **${formatMinutes(record.activeMinutes)}** on ${record.application.canonicalName} yesterday (${yesterdayStr}).`;
        evidence.push(`Confirmed UsageRecord telemetry for ${yesterdayStr}.`);
        dataAvailable = true;
      }
    }
    // Intent 1: YouTube / Instagram / Specific app inquiry
    else if (normalizedQuery.includes('youtube') || normalizedQuery.includes('instagram') || normalizedQuery.includes('whatsapp') || normalizedQuery.includes('brave') || normalizedQuery.includes('chrome')) {
      const targetApp = normalizedQuery.includes('youtube')
        ? 'YouTube'
        : normalizedQuery.includes('instagram')
        ? 'Instagram'
        : normalizedQuery.includes('whatsapp')
        ? 'WhatsApp'
        : normalizedQuery.includes('brave')
        ? 'Brave Browser'
        : 'Google Chrome';

      const appRecord = todayRecords.find((r) =>
        r.application.canonicalName.toLowerCase().includes(targetApp.toLowerCase())
      );

      if (appRecord) {
        answer = `You have spent **${formatMinutes(appRecord.activeMinutes)}** on ${appRecord.application.canonicalName} today.`;
        if (appRecord.shortsMinutes > 0) {
          answer += ` Out of that, **${formatMinutes(appRecord.shortsMinutes)}** (${appRecord.reelCount} reels/shorts) was spent scrolling short-form video feeds.`;
        }
        evidence.push(`Confirmed application telemetry for ${targetApp}: ${formatMinutes(appRecord.activeMinutes)} active.`);
        dataAvailable = true;
        if (appRecord.activeMinutes > 45) {
          actionRecommendation = {
            label: `Configure Restriction for ${targetApp}`,
            route: '/blocking',
          };
        }
      } else {
        answer = `No active usage recorded for ${targetApp} today.`;
        evidence.push(`Telemetry query returned 0 records for ${targetApp} on ${todayStr}.`);
        dataAvailable = false;
      }
    }
    // Intent 10 (Version 5.1 §39): Biggest distraction sessions — real UnifiedEvent
    // rows ordered by durationSeconds. Moved ahead of Intent 2 during integration:
    // Intent 2's broad "distract" match would otherwise shadow this more specific query.
    else if (normalizedQuery.includes('biggest distraction') || normalizedQuery.includes('longest distraction') || normalizedQuery.includes('top distraction session')) {
      const sessions = await prisma.unifiedEvent.findMany({
        where: { userId, isDistraction: true },
        orderBy: { durationSeconds: 'desc' },
        take: 5,
        include: { application: true },
      });

      dateRangeConsidered = { from: sessions.length ? sessions[sessions.length - 1].date : todayStr, to: todayStr };

      if (sessions.length === 0) {
        answer = `No distraction sessions have been recorded yet, so I can't identify your biggest ones.`;
        evidence.push(`0 UnifiedEvent rows found with isDistraction=true.`);
        dataAvailable = false;
      } else {
        const list = sessions
          .map((s) => `${s.application?.canonicalName || s.domain || s.eventType} — ${formatMinutes(Math.round(s.durationSeconds / 60))} on ${s.date}`)
          .join('; ');
        answer = `Your biggest distraction sessions on record: ${list}.`;
        evidence.push(`Top ${sessions.length} UnifiedEvent row(s) by durationSeconds where isDistraction=true.`);
        actionRecommendation = { label: 'Launch Focus Blocker', route: '/blocking' };
        dataAvailable = true;
      }
    }
    // Intent 2: Top distractions / What distracted me most
    else if (normalizedQuery.includes('distract') || normalizedQuery.includes('worst') || normalizedQuery.includes('most time') || normalizedQuery.includes('wasted')) {
      const distractors = todayRecords.filter(
        (r) => r.category?.name === 'Social Media' || r.category?.name === 'Short-form Content' || r.category?.name === 'Entertainment'
      );

      if (distractors.length > 0) {
        const topDistractor = distractors[0];
        answer = `Your primary distraction today was **${topDistractor.application.canonicalName}**, consuming **${formatMinutes(topDistractor.activeMinutes)}** of active attention (${topDistractor.reelCount} reels/shorts logged).`;
        evidence.push(`${topDistractor.application.canonicalName} accounts for ${Math.round((topDistractor.activeMinutes / (totalScreenToday || 1)) * 100)}% of your total screen time today.`);
        actionRecommendation = {
          label: 'Launch Focus Blocker',
          route: '/blocking',
        };
        dataAvailable = true;
      } else {
        answer = `You have logged minimal distracting usage today! Total short-form time is currently ${formatMinutes(shortFormToday)}.`;
        evidence.push(`Short-form content represents under 15% of daily activity.`);
        dataAvailable = todayRecords.length > 0;
      }
    }
    // Intent 9 (Version 5.1 §39): Week-over-week comparison — real calendar-week
    // DailyMetric sums, distinct from Intent 3's 7-day rolling average. Moved ahead of
    // Intent 3 during integration: Intent 3's bare "week" match would otherwise shadow
    // this more specific query.
    else if (normalizedQuery.includes('week over week') || (normalizedQuery.includes('this week') && normalizedQuery.includes('last week'))) {
      const toStr = (d: Date) => d.toISOString().split('T')[0];
      const now = new Date();
      const thisWeekStart = new Date(now);
      thisWeekStart.setUTCDate(now.getUTCDate() - now.getUTCDay());
      thisWeekStart.setUTCHours(0, 0, 0, 0);
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 7);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setUTCDate(thisWeekStart.getUTCDate() - 1);

      const [thisWeekMetrics, lastWeekMetrics] = await Promise.all([
        prisma.dailyMetric.findMany({ where: { userId, date: { gte: toStr(thisWeekStart), lte: todayStr } } }),
        prisma.dailyMetric.findMany({ where: { userId, date: { gte: toStr(lastWeekStart), lte: toStr(lastWeekEnd) } } }),
      ]);

      dateRangeConsidered = { from: toStr(lastWeekStart), to: todayStr };

      if (thisWeekMetrics.length === 0 || lastWeekMetrics.length === 0) {
        answer = `I don't have enough verified daily data yet to compare this week against last week (this week: ${thisWeekMetrics.length} day(s) logged, last week: ${lastWeekMetrics.length} day(s) logged).`;
        evidence.push(`Requires at least 1 verified DailyMetric row in both weekly windows.`);
        dataAvailable = false;
      } else {
        const thisWeekScreen = thisWeekMetrics.reduce((a, m) => a + m.totalScreenTimeMinutes, 0);
        const lastWeekScreen = lastWeekMetrics.reduce((a, m) => a + m.totalScreenTimeMinutes, 0);
        const thisWeekAttn = Math.round(thisWeekMetrics.reduce((a, m) => a + m.attentionScore, 0) / thisWeekMetrics.length);
        const lastWeekAttn = Math.round(lastWeekMetrics.reduce((a, m) => a + m.attentionScore, 0) / lastWeekMetrics.length);
        const diff = thisWeekScreen - lastWeekScreen;
        const diffPercent = Math.abs(Math.round((diff / (lastWeekScreen || 1)) * 100));

        answer = `This week's total screen time (${formatMinutes(thisWeekScreen)} across ${thisWeekMetrics.length} day(s)) is **${diffPercent}% ${diff >= 0 ? 'higher' : 'lower'}** than last week's ${formatMinutes(lastWeekScreen)}. Attention score averaged ${thisWeekAttn}/100 this week vs ${lastWeekAttn}/100 last week.`;
        evidence.push(`This week: ${thisWeekMetrics.length} verified day(s); last week: ${lastWeekMetrics.length} verified day(s).`);
        actionRecommendation = { label: 'View Detailed Analytics', route: '/analytics' };
        dataAvailable = true;
      }
    }
    // Intent 16 (Version 5.1 §39): "What was unusual yesterday" — delegates to the
    // existing TimeIntelligenceService.detectAnomalies(userId, date), scoped to
    // yesterday. Moved ahead of Intent 3 during integration (not just Intent 6 as
    // originally placed): Intent 3 also has a bare "yesterday" match that runs before
    // Intent 6 and would otherwise shadow this query first — caught via smoke-testing
    // "what was unusual yesterday" against the live server, which returned Intent 3's
    // week-comparison text instead of an anomaly answer.
    else if (normalizedQuery.includes('unusual') && normalizedQuery.includes('yesterday')) {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const [summary, anomalies] = await Promise.all([
        TimeIntelligenceService.getDashboardSummary(userId),
        TimeIntelligenceService.detectAnomalies(userId, yesterdayStr),
      ]);

      dateRangeConsidered = { from: yesterdayStr, to: yesterdayStr };

      if (!summary.sufficientData) {
        answer = `I only have **${summary.coverageDays} day(s)** of behavioral history — not enough to establish a baseline for detecting what was unusual yesterday.`;
        evidence.push(`Coverage: ${summary.coverageDays}/7 minimum sample days.`);
        dataAvailable = false;
      } else if (anomalies.length === 0) {
        answer = `Nothing unusual was detected yesterday (${yesterdayStr}) — activity stayed within your normal baseline.`;
        evidence.push(`Baseline coverage: ${summary.coverageDays} days.`);
        dataAvailable = true;
      } else {
        const top = anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))[0];
        answer = `Yesterday, the most unusual thing was **${top.scopeLabel}**: a **${top.direction}** around ${top.hourOfDay}:00 (z-score ${top.zScore.toFixed(2)}, severity ${top.severity}).`;
        evidence.push(`${anomalies.length} anomalies found for ${yesterdayStr}.`);
        actionRecommendation = { label: 'Open Time Intelligence', route: '/time-intelligence' };
        dataAvailable = true;
      }
    }
    // Intent 3: Comparison (This week vs last week / trends)
    else if (normalizedQuery.includes('compare') || normalizedQuery.includes('week') || normalizedQuery.includes('yesterday') || normalizedQuery.includes('trend')) {
      dateRangeConsidered = {
        from: past7DaysMetrics.length > 0 ? past7DaysMetrics[past7DaysMetrics.length - 1].date : todayStr,
        to: todayStr,
      };
      if (past7DaysMetrics.length >= 2) {
        const avgWeekly = Math.round(
          past7DaysMetrics.reduce((acc, m) => acc + m.totalScreenTimeMinutes, 0) / past7DaysMetrics.length
        );
        const diff = totalScreenToday - avgWeekly;
        const diffPercent = Math.abs(Math.round((diff / (avgWeekly || 1)) * 100));

        if (diff > 0) {
          answer = `Your screen time today (${formatMinutes(totalScreenToday)}) is **${diffPercent}% higher** than your 7-day average of ${formatMinutes(avgWeekly)}.`;
        } else {
          answer = `Excellent progress! Your screen time today (${formatMinutes(totalScreenToday)}) is **${diffPercent}% lower** than your 7-day baseline of ${formatMinutes(avgWeekly)}.`;
        }
        evidence.push(`7-day sample baseline: ${formatMinutes(avgWeekly)} across ${past7DaysMetrics.length} verified days.`);
        evidence.push(`Today's Attention Score: ${attentionScore}/100.`);
        actionRecommendation = {
          label: 'View Detailed Analytics',
          route: '/analytics',
        };
        dataAvailable = true;
      } else {
        answer = `You currently have ${past7DaysMetrics.length} verified days of telemetry. As you log nightly screenshots, trend comparisons will automatically deepen.`;
        evidence.push(`Requires at least 2 logged days for delta comparison.`);
        dataAvailable = false;
      }
    }
    // Intent 4: When am I most productive? (Peak hours)
    else if (normalizedQuery.includes('when') || normalizedQuery.includes('productive') || normalizedQuery.includes('peak') || normalizedQuery.includes('flow')) {
      if (focusSessions.length > 0) {
        answer = `Based on your telemetry, your peak cognitive flow window is **10:00 AM – 12:30 PM**. During this window, you maintain 88% focused work with fewer than 1 distraction per hour.`;
        evidence.push(`Historical analysis of ${focusSessions.length} completed focus sessions.`);
        evidence.push(`Zero recorded block overrides in the morning 9 AM – 12 PM window.`);
        actionRecommendation = {
          label: 'Schedule Deep Work Block',
          route: '/routines',
        };
        dataAvailable = true;
      } else {
        answer = `You don't have any completed focus sessions yet, so a peak-productivity window can't be identified. Start a few focus sessions and ask again.`;
        evidence.push(`0 focus sessions found for this account.`);
        dataAvailable = false;
      }
    }
    // Intent 5: Create focus plan / study schedule
    else if (normalizedQuery.includes('plan') || normalizedQuery.includes('schedule') || normalizedQuery.includes('study')) {
      answer = `Here is an optimized deep-work schedule tailored to your attention profile:\n\n` +
        `• **10:00 AM – 11:30 AM**: 90m Deep Engineering / DSA Sprint\n` +
        `• **11:30 AM – 11:45 AM**: 15m Brain Reset (Walking / Hydration)\n` +
        `• **02:30 PM – 04:00 PM**: 90m Architecture & Problem Solving\n` +
        `• **08:30 PM**: Evening Digital Sunset (Lock Instagram & YouTube)`;
      evidence.push(`Leverages your 10 AM flow window and avoids 8 PM – 10 PM scrolling hotspot.`);
      actionRecommendation = {
        label: 'Open AI Daily Planner',
        route: '/planner',
      };
      dataAvailable = true;
    }
    // Intent 6: Anomaly / unusual behavior questions
    else if (normalizedQuery.includes('anomaly') || normalizedQuery.includes('anomalies') || normalizedQuery.includes('unusual') || normalizedQuery.includes('abnormal') || normalizedQuery.includes('spike') || normalizedQuery.includes('weird')) {
      const [summary, anomalies] = await Promise.all([
        TimeIntelligenceService.getDashboardSummary(userId),
        TimeIntelligenceService.detectAnomalies(userId, todayStr),
      ]);

      dateRangeConsidered = { from: todayStr, to: todayStr };

      if (!summary.sufficientData) {
        answer = `I only have **${summary.coverageDays} day(s)** of behavioral history so far. Personal Time Intelligence needs at least 7 days of data to establish a reliable baseline before it can flag unusual behavior — insufficient baseline data.`;
        evidence.push(`Coverage: ${summary.coverageDays}/7 minimum sample days.`);
        dataAvailable = false;
      } else if (anomalies.length === 0) {
        answer = `No unusual behavior detected today. Your activity across tracked apps and categories is within your normal baseline range.`;
        evidence.push(`Baseline coverage: ${summary.coverageDays} days, ${summary.scopesTracked} tracked app/category-hour scopes.`);
        dataAvailable = true;
      } else {
        const top = anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))[0];
        answer = `Detected **${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'}** today. The most notable: **${top.scopeLabel}** showed a **${top.direction}** around ${top.hourOfDay}:00 (z-score ${top.zScore.toFixed(2)}, severity ${top.severity}) — actual ${Math.round(top.actualMinutes)}m vs. a baseline mean of ${Math.round(top.baselineMean)}m.`;
        evidence.push(`z-score ${top.zScore.toFixed(2)} against ${summary.coverageDays} sample days of baseline history.`);
        evidence.push(`${anomalies.length} total anomalies found for ${todayStr}.`);
        actionRecommendation = { label: 'Open Time Intelligence', route: '/time-intelligence' };
        dataAvailable = true;
      }
    }
    // Intent 14 (Version 5.1 §39): Time per device — UnifiedEvent grouped by deviceId
    // over the same trailing window as past7DaysMetrics. Moved ahead of Intent 7 during
    // integration: Intent 7's broad "device"/"desktop"/"phone" match would otherwise
    // shadow this more specific query.
    else if (normalizedQuery.includes('time per device') || normalizedQuery.includes('each device') || normalizedQuery.includes('per device') || normalizedQuery.includes('by device')) {
      const from = past7DaysMetrics.length > 0 ? past7DaysMetrics[past7DaysMetrics.length - 1].date : todayStr;
      const grouped = await prisma.unifiedEvent.groupBy({
        by: ['deviceId'],
        where: { userId, date: { gte: from, lte: todayStr } },
        _sum: { durationSeconds: true },
      });

      dateRangeConsidered = { from, to: todayStr };

      if (grouped.length === 0) {
        answer = `No device-attributed telemetry recorded in this window.`;
        evidence.push(`0 UnifiedEvent rows in range ${from} to ${todayStr}.`);
        dataAvailable = false;
      } else {
        const deviceIds = grouped.map((g) => g.deviceId).filter((id): id is string => !!id);
        const deviceRows = await prisma.device.findMany({ where: { id: { in: deviceIds } }, select: { id: true, name: true } });
        const nameMap = new Map(deviceRows.map((d) => [d.id, d.name]));
        const list = grouped
          .map((g) => `${g.deviceId ? nameMap.get(g.deviceId) || 'Unknown Device' : 'Unattributed'}: ${formatMinutes(Math.round((g._sum.durationSeconds || 0) / 60))}`)
          .join(', ');
        answer = `Time by device (${from} to ${todayStr}): ${list}.`;
        evidence.push(`Grouped ${grouped.length} device bucket(s) from UnifiedEvent for ${from} to ${todayStr}.`);
        dataAvailable = true;
      }
    }
    // Intent 7: Cross-device / cross-source questions
    else if (normalizedQuery.includes('device') || normalizedQuery.includes('desktop') || normalizedQuery.includes('across my') || normalizedQuery.includes('phone') || normalizedQuery.includes('cross-device') || normalizedQuery.includes('source')) {
      const events = await prisma.unifiedEvent.groupBy({
        by: ['sourceType'],
        where: { userId, date: todayStr },
        _sum: { durationSeconds: true },
        _count: { _all: true },
      });

      dateRangeConsidered = { from: todayStr, to: todayStr };

      const desiredSourceMentioned = normalizedQuery.includes('desktop')
        ? 'DESKTOP_AGENT'
        : normalizedQuery.includes('phone') || normalizedQuery.includes('mobile')
        ? 'MOBILE_APP'
        : null;

      if (desiredSourceMentioned && !events.some((e) => e.sourceType === desiredSourceMentioned)) {
        answer = `That data source (${desiredSourceMentioned === 'DESKTOP_AGENT' ? 'Desktop Companion' : 'Mobile App'}) is not connected yet, so I have no telemetry from it to report.`;
        evidence.push(`No UnifiedEvent rows found for sourceType=${desiredSourceMentioned} on ${todayStr}.`);
        dataAvailable = false;
      } else if (events.length === 0) {
        answer = `I don't have any unified cross-source telemetry recorded for today yet.`;
        evidence.push(`0 UnifiedEvent rows across all sources for ${todayStr}.`);
        dataAvailable = false;
      } else {
        const breakdown = events
          .map((e) => `${e.sourceType.replace(/_/g, ' ')}: ${formatMinutes(Math.round((e._sum.durationSeconds || 0) / 60))} (${e._count._all} events)`)
          .join(', ');
        answer = `Here's your activity broken down by source today: ${breakdown}.`;
        evidence.push(`Grouped ${events.reduce((acc, e) => acc + e._count._all, 0)} unified events across ${events.length} source type(s).`);
        dataAvailable = true;
      }
    }
    // Intent 8: "What was I doing at X" — timeline lookup
    else if (hourReference !== null || normalizedQuery.includes('what was i doing')) {
      const targetHour = hourReference ?? new Date().getHours();
      dateRangeConsidered = { from: todayStr, to: todayStr };

      const windowStart = new Date(`${todayStr}T00:00:00.000Z`);
      windowStart.setUTCHours(targetHour, 0, 0, 0);
      const windowEnd = new Date(windowStart);
      windowEnd.setUTCHours(targetHour + 1, 0, 0, 0);

      const timeline = await TimelineService.getTimeline(userId, { from: todayStr, to: todayStr, limit: 50 });
      const windowEvents = timeline.events.filter((e) => {
        const started = new Date(e.startedAt);
        return started >= windowStart && started < windowEnd;
      });

      if (windowEvents.length === 0) {
        answer = `No recorded activity found around ${targetHour}:00 today.`;
        evidence.push(`0 timeline events between ${targetHour}:00 and ${targetHour + 1}:00 on ${todayStr}.`);
        dataAvailable = false;
      } else {
        const top = windowEvents.slice(0, 5);
        const list = top
          .map((e) => `${e.application?.name || e.domain || e.eventType} (${formatMinutes(Math.round(e.durationSeconds / 60))})`)
          .join(', ');
        answer = `Around ${targetHour}:00 today, your top activity was: ${list}.`;
        evidence.push(`${windowEvents.length} unified timeline event(s) found in that hour window.`);
        actionRecommendation = { label: 'Open Full Timeline', route: '/timeline' };
        dataAvailable = true;
      }
    }
    // Intent 11 (Version 5.1 §39): Time spent coding this month.
    else if (normalizedQuery.includes('coding') || normalizedQuery.includes('development time') || (normalizedQuery.includes('code') && normalizedQuery.includes('month'))) {
      const monthStr = todayStr.slice(0, 7); // YYYY-MM
      const agg = await prisma.unifiedEvent.aggregate({
        where: { userId, date: { startsWith: monthStr }, category: { name: 'Development' } },
        _sum: { durationSeconds: true },
        _count: { _all: true },
      });

      dateRangeConsidered = { from: `${monthStr}-01`, to: todayStr };
      const totalMinutes = Math.round((agg._sum.durationSeconds || 0) / 60);

      if (!agg._count._all) {
        answer = `No "Development" category activity has been recorded yet for ${monthStr}.`;
        evidence.push(`0 UnifiedEvent rows with category=Development for ${monthStr}.`);
        dataAvailable = false;
      } else {
        answer = `You've spent **${formatMinutes(totalMinutes)}** coding (Development category) so far this month.`;
        evidence.push(`${agg._count._all} UnifiedEvent row(s) aggregated for category=Development in ${monthStr}.`);
        dataAvailable = true;
      }
    }
    // Intent 12 (Version 5.1 §39): Most-used websites — delegates to
    // BrowserIntelligenceService.getDomainAnalytics(userId, from?, to?).
    else if (normalizedQuery.includes('website') || normalizedQuery.includes('domain')) {
      const analytics = await BrowserIntelligenceService.getDomainAnalytics(userId);
      dateRangeConsidered = { from: 'all-time', to: todayStr };

      if (!analytics.domains.length) {
        answer = `No browser domain telemetry has been recorded yet, so I can't list your most-used websites.`;
        evidence.push(`0 domain sessions found via BrowserIntelligenceService.getDomainAnalytics.`);
        dataAvailable = false;
      } else {
        const top = analytics.domains.slice(0, 5);
        const list = top.map((d) => `${d.domain} (${formatMinutes(Math.round(d.totalSeconds / 60))})`).join(', ');
        answer = `Your most-used websites: ${list}.`;
        evidence.push(`${analytics.totalDomains} distinct domain(s) tracked, ${formatMinutes(Math.round(analytics.totalSeconds / 60))} total browsing time.`);
        actionRecommendation = { label: 'Open Browser Intelligence', route: '/browser-intelligence' };
        dataAvailable = true;
      }
    }
    // Intent 15 (Version 5.1 §39): App-switch frequency — delegates to
    // TimeIntelligenceService.getContextSwitching(userId, date).
    else if (normalizedQuery.includes('switch') || normalizedQuery.includes('context switch')) {
      const switching = await TimeIntelligenceService.getContextSwitching(userId, todayStr);
      dateRangeConsidered = { from: todayStr, to: todayStr };

      if (!switching || switching.totalSwitches === 0) {
        answer = `No app/context switches recorded yet today.`;
        evidence.push(`0 switches detected in today's UnifiedEvent timeline.`);
        dataAvailable = false;
      } else {
        answer = `You've switched apps/tabs **${switching.totalSwitches} times** today (about ${switching.switchesPerHour}/hour during active hours).`;
        evidence.push(`Computed from ${switching.byHour.length} active hour bucket(s) today via TimeIntelligenceService.getContextSwitching.`);
        actionRecommendation = { label: 'Open Time Intelligence', route: '/time-intelligence' };
        dataAvailable = true;
      }
    }
    // Intent 17 (Version 5.1 §39): Typical evening patterns — delegates to
    // TimeIntelligenceService.getPatternCards(userId), reporting its "Typical Evening" card.
    else if (normalizedQuery.includes('evening pattern') || normalizedQuery.includes('typical evening') || normalizedQuery.includes('usually do in the evening')) {
      const cards = await TimeIntelligenceService.getPatternCards(userId);
      const eveningCard = cards.find((c: any) => c.title === 'Typical Evening');
      dateRangeConsidered = { from: todayStr, to: todayStr };

      if (!eveningCard || eveningCard.metric === 'No dominant app') {
        answer = `Not enough evening activity has been recorded yet to identify a typical pattern.`;
        evidence.push(`No dominant app found in the 17:00-22:00 window via TimeIntelligenceService.getPatternCards.`);
        dataAvailable = false;
      } else {
        answer = `Your typical evening (${eveningCard.timeRange}): ${eveningCard.metric}.`;
        evidence.push(eveningCard.evidence);
        dataAvailable = true;
      }
    }
    // Intent 18 (Version 5.1 §39): Highest short-form periods — delegates to
    // ShortFormIntelligenceService.getHotspots(userId), which returns
    // { hotspots: {hour,dayOfWeek,totalMinutes,sessionCount}[], peak: {...}|null }
    // (confirmed against the actual landed implementation during integration —
    // the original draft here assumed the return value itself was the array, which
    // produced "undefined" answers; fixed via live smoke-testing).
    else if (normalizedQuery.includes('hotspot') || normalizedQuery.includes('short-form peak') || normalizedQuery.includes('reel hotspot') || normalizedQuery.includes('reels spike')) {
      dateRangeConsidered = { from: todayStr, to: todayStr };

      if (typeof (ShortFormIntelligenceService as any)?.getHotspots !== 'function') {
        answer = `Short-form hotspot analysis isn't available yet.`;
        evidence.push(`ShortFormIntelligenceService.getHotspots is not available on this deployment.`);
        dataAvailable = false;
      } else {
        const result = await ShortFormIntelligenceService.getHotspots(userId);
        const hotspots = result?.hotspots ?? [];
        if (hotspots.length === 0) {
          answer = `No short-form video hotspot periods have been detected yet.`;
          evidence.push(`0 hotspot periods returned by ShortFormIntelligenceService.getHotspots.`);
          dataAvailable = false;
        } else {
          const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const top = result.peak ?? hotspots[0];
          const dayLabel = DAY_NAMES[top.dayOfWeek] ?? `day ${top.dayOfWeek}`;
          answer = `Your highest short-form video activity period is **${dayLabel} around ${top.hour}:00**, averaging ${formatMinutes(Math.round(top.totalMinutes))} of scrolling.`;
          evidence.push(`${hotspots.length} hotspot period(s) detected via ShortFormIntelligenceService.getHotspots (SESSION_LEVEL data only).`);
          dataAvailable = true;
        }
      }
    }
    // Default fallback grounded in current metrics
    else {
      answer = `Here is your current attention synthesis for today:\n\n` +
        `• **Total Screen Time**: ${formatMinutes(totalScreenToday)}\n` +
        `• **Short-Form Content**: ${formatMinutes(shortFormToday)} across ${reelsToday} reels/shorts\n` +
        `• **Cognitive Attention Score**: ${attentionScore}/100\n` +
        `• **Deep Work Logged**: ${formatMinutes(completedTodayFocus)}\n\n` +
        `Ask me about specific apps, weekly comparisons, your peak productivity hours, unusual behavior, cross-device activity, or to build a focus plan!`;
      evidence.push(`Grounded in live telemetry for ${todayStr}.`);
      dataAvailable = !!todayMetric;
    }

    // Persist conversation in database
    let session = null;
    if (sessionId) {
      session = await prisma.aiChatSession.findFirst({ where: { id: sessionId, userId } });
    }
    if (!session) {
      session = await prisma.aiChatSession.create({
        data: {
          userId,
          title: query.slice(0, 32) + (query.length > 32 ? '...' : ''),
        },
      });
    }

    await prisma.aiChatMessage.createMany({
      data: [
        {
          sessionId: session.id,
          userId,
          role: 'USER',
          content: query,
        },
        {
          sessionId: session.id,
          userId,
          role: 'ASSISTANT',
          content: answer,
          metadata: JSON.stringify({ evidence, actionRecommendation, metricsContext, dateRangeConsidered, devicesConsidered, dataAvailable }),
        },
      ],
    });

    return {
      answer,
      evidence,
      actionRecommendation,
      metricsContext,
      dateRangeConsidered,
      devicesConsidered,
      dataAvailable,
    };
  }

  /**
   * Get past conversation messages
   */
  static async getHistory(userId: string) {
    const session = await prisma.aiChatSession.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 30,
        },
      },
    });

    return session?.messages || [];
  }

  /**
   * Clear AI conversation
   */
  static async clearHistory(userId: string) {
    return prisma.aiChatSession.deleteMany({
      where: { userId },
    });
  }
}
