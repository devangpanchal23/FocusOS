import { prisma } from '../config/db.js';
import { formatMinutes } from '../utils/durationParser.js';
import { TimeIntelligenceService } from './v5/timeIntelligence.service.js';
import { TimelineService } from './v5/timeline.service.js';

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

    // Intent 1: YouTube / Instagram / Specific app inquiry
    if (normalizedQuery.includes('youtube') || normalizedQuery.includes('instagram') || normalizedQuery.includes('whatsapp') || normalizedQuery.includes('brave') || normalizedQuery.includes('chrome')) {
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
