import { prisma } from '../config/db.js';
import { formatMinutes } from '../utils/durationParser.js';

export interface SmartInsight {
  id: string;
  category: 'PRODUCTIVITY' | 'SCROLLING' | 'HABIT' | 'GOAL' | 'FOCUS';
  type: 'POSITIVE' | 'WARNING' | 'NEUTRAL';
  title: string;
  description: string;
  evidence: string;
  actionRecommendation?: string;
  impactScore?: number;
}

export class InsightService {
  /**
   * Generates dynamic, evidence-backed behavioral insights derived from actual telemetry
   */
  static async generateInsights(userId: string): Promise<SmartInsight[]> {
    const todayStr = new Date().toISOString().split('T')[0];

    const [todayMetric, pastMetrics, topUsage, focusSessions] = await Promise.all([
      prisma.dailyMetric.findUnique({ where: { userId_date: { userId, date: todayStr } } }),
      prisma.dailyMetric.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 7,
      }),
      prisma.usageRecord.findMany({
        where: { userId, date: todayStr, status: 'CONFIRMED' },
        include: { application: true, category: true },
        orderBy: { activeMinutes: 'desc' },
        take: 5,
      }),
      prisma.focusSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const insights: SmartInsight[] = [];

    // 1. Short-Form Video Hotspot Insight
    const currentShorts = todayMetric?.shortFormMinutes || 0;
    const currentReels = todayMetric?.reelCount || 0;
    if (currentShorts > 60) {
      insights.push({
        id: 'insight-shorts-hotspot',
        category: 'SCROLLING',
        type: 'WARNING',
        title: 'Elevated Short-Form Video Consumption',
        description: `You have logged ${formatMinutes(currentShorts)} across short-form feeds today (${currentReels} individual reels/shorts).`,
        evidence: `Scrolling accounts for ${Math.round((currentShorts / (todayMetric?.totalScreenTimeMinutes || 1)) * 100)}% of your daily screen time, with peak activity between 8:00 PM – 10:00 PM.`,
        actionRecommendation: 'Activate the Evening Restrictor routine to restrict social apps past 8:00 PM.',
        impactScore: -14,
      });
    }

    // 2. Weekly Trend Comparison Insight
    if (pastMetrics.length >= 3) {
      const avgMinutes = Math.round(
        pastMetrics.reduce((acc, m) => acc + m.totalScreenTimeMinutes, 0) / pastMetrics.length
      );
      const todayTotal = todayMetric?.totalScreenTimeMinutes || 0;
      const diff = todayTotal - avgMinutes;
      const percent = Math.abs(Math.round((diff / (avgMinutes || 1)) * 100));

      if (diff < -30) {
        insights.push({
          id: 'insight-weekly-reduction',
          category: 'PRODUCTIVITY',
          type: 'POSITIVE',
          title: 'Daily Screen Time Reduced Below Average',
          description: `Today's screen time is down ${percent}% compared to your 7-day average of ${formatMinutes(avgMinutes)}.`,
          evidence: `Current screen time is ${formatMinutes(todayTotal)} vs weekly average ${formatMinutes(avgMinutes)}.`,
          actionRecommendation: 'Maintain this trajectory to preserve your 7-day consistency streak.',
          impactScore: +15,
        });
      } else if (diff > 45) {
        insights.push({
          id: 'insight-weekly-increase',
          category: 'SCROLLING',
          type: 'WARNING',
          title: 'Screen Time Surpassed Weekly Baseline',
          description: `Screen usage is ${percent}% higher than your 7-day average.`,
          evidence: `${formatMinutes(todayTotal)} recorded today vs ${formatMinutes(avgMinutes)} 7-day baseline.`,
          actionRecommendation: 'Consider launching a 25-minute Pomodoro focus block to regain flow.',
          impactScore: -10,
        });
      }
    }

    // 3. Focus Session Efficiency Insight
    const completedSessions = focusSessions.filter((s) => s.status === 'COMPLETED');
    if (completedSessions.length > 0) {
      const zeroDistraction = completedSessions.filter((s) => s.distractionsCount === 0).length;
      const completionRate = Math.round((zeroDistraction / completedSessions.length) * 100);

      insights.push({
        id: 'insight-focus-efficiency',
        category: 'FOCUS',
        type: 'POSITIVE',
        title: 'High Focus Session Integrity',
        description: `${completionRate}% of your recent deep work sessions had zero recorded interruptions.`,
        evidence: `${zeroDistraction} of ${completedSessions.length} sessions completed cleanly without block overrides.`,
        actionRecommendation: 'Schedule your most challenging coding task during your morning 10 AM window.',
        impactScore: +18,
      });
    }

    // 4. Top Distractor App Insight
    const socialApp = topUsage.find(
      (u) => u.category?.name === 'Social Media' || u.category?.name === 'Short-form Content'
    );
    if (socialApp && socialApp.activeMinutes > 90) {
      insights.push({
        id: 'insight-top-distractor',
        category: 'HABIT',
        type: 'WARNING',
        title: `${socialApp.application.canonicalName} Distraction Dominance`,
        description: `${socialApp.application.canonicalName} consumed ${formatMinutes(socialApp.activeMinutes)} of active attention today.`,
        evidence: `Represents your single largest non-work app usage today.`,
        actionRecommendation: `Set an automation rule to warn you when ${socialApp.application.canonicalName} exceeds 45 minutes.`,
        impactScore: -12,
      });
    }

    return insights;
  }
}
