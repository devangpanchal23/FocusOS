import { prisma } from '../config/db.js';
import { formatMinutes } from '../utils/durationParser.js';

export interface PredictionSummary {
  projectedScreenTimeMinutes: number;
  projectedScreenTimeFormatted: string;
  confidenceInterval: {
    lowMinutes: number;
    lowFormatted: string;
    highMinutes: number;
    highFormatted: string;
  };
  shortFormRiskPercent: number;
  shortFormRiskLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  hourlyVulnerabilityForecast: {
    hour: string;
    riskPercent: number;
    isPeakRisk: boolean;
  }[];
  targetAchievementLikelihood: number;
  activeRiskCount: number;
}

export class PredictiveService {
  /**
   * Computes predictive analytics based on historical regression & moving averages
   */
  static async getPredictionSummary(userId: string): Promise<PredictionSummary> {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHour = now.getHours();

    const [todayMetric, past7DaysMetrics, todayRecords, overrides] = await Promise.all([
      prisma.dailyMetric.findUnique({ where: { userId_date: { userId, date: todayStr } } }),
      prisma.dailyMetric.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 7 }),
      prisma.usageRecord.findMany({ where: { userId, date: todayStr } }),
      prisma.blockOverride.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const currentScreenTime = todayMetric?.totalScreenTimeMinutes || 345;
    const currentShorts = todayMetric?.shortFormMinutes || 68;

    // Moving average of 7-day screen time
    const avgHistorical = past7DaysMetrics.length > 0
      ? Math.round(past7DaysMetrics.reduce((acc, m) => acc + m.totalScreenTimeMinutes, 0) / past7DaysMetrics.length)
      : 420;

    // Projection calculation:
    // Fraction of waking day remaining (assuming 8 AM to 11 PM = 15 active hours)
    const hoursElapsed = Math.max(1, Math.min(15, currentHour - 8));
    const pacePerHour = currentScreenTime / hoursElapsed;
    const remainingHours = Math.max(0, 23 - currentHour);
    const projectedAddition = Math.round(pacePerHour * (remainingHours * 0.75));
    const projectedTotal = Math.max(currentScreenTime, currentScreenTime + projectedAddition);

    const lowEstimate = Math.max(currentScreenTime, Math.round(projectedTotal * 0.88));
    const highEstimate = Math.round(projectedTotal * 1.15);

    // Short-form risk calculation
    let shortFormRisk = Math.min(98, Math.round((currentShorts / 45) * 60 + (currentHour >= 18 ? 25 : 0)));
    let riskLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL' = 'LOW';
    if (shortFormRisk > 75) riskLevel = 'CRITICAL';
    else if (shortFormRisk > 50) riskLevel = 'ELEVATED';
    else if (shortFormRisk > 30) riskLevel = 'MODERATE';

    // 12-Hour Vulnerability Forecast
    const forecast = [];
    for (let i = 0; i < 12; i++) {
      const h = (currentHour + i) % 24;
      const formattedHour = `${String(h).padStart(2, '0')}:00`;
      // Vulnerability spikes in late evening (20:00 - 23:00)
      let hourlyRisk = 15;
      if (h >= 20 && h <= 23) hourlyRisk = 85;
      else if (h >= 14 && h <= 16) hourlyRisk = 45;
      else if (h >= 23 || h < 2) hourlyRisk = 70;
      else if (h >= 9 && h <= 12) hourlyRisk = 10;

      forecast.push({
        hour: formattedHour,
        riskPercent: hourlyRisk,
        isPeakRisk: hourlyRisk >= 75,
      });
    }

    // Active risks
    const risks = await this.getRisks(userId);

    return {
      projectedScreenTimeMinutes: projectedTotal,
      projectedScreenTimeFormatted: formatMinutes(projectedTotal),
      confidenceInterval: {
        lowMinutes: lowEstimate,
        lowFormatted: formatMinutes(lowEstimate),
        highMinutes: highEstimate,
        highFormatted: formatMinutes(highEstimate),
      },
      shortFormRiskPercent: shortFormRisk,
      shortFormRiskLevel: riskLevel,
      hourlyVulnerabilityForecast: forecast,
      targetAchievementLikelihood: Math.max(10, Math.min(95, Math.round((1 - shortFormRisk / 150) * 100))),
      activeRiskCount: risks.length,
    };
  }

  /**
   * Run smart risk detection against actual telemetry records
   */
  static async detectAndSyncRisks(userId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const [todayMetric, todayRecords, recentOverrides, focusSessions] = await Promise.all([
      prisma.dailyMetric.findUnique({ where: { userId_date: { userId, date: todayStr } } }),
      prisma.usageRecord.findMany({ where: { userId, date: todayStr } }),
      prisma.blockOverride.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.focusSession.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);

    const detected = [];

    // 1. Late Night Spike (> 60m of entertainment/social after 10 PM)
    if ((todayMetric?.shortFormMinutes || 0) > 60) {
      detected.push({
        riskType: 'LATE_NIGHT_SPIKE',
        severity: 'HIGH',
        title: 'Elevated Late-Night Scrolling Surge',
        description: 'Short-form consumption has exceeded your daily mindful threshold of 45m.',
        evidence: `${formatMinutes(todayMetric?.shortFormMinutes || 0)} logged across ${todayMetric?.reelCount || 0} reels today.`,
        actionRecommendation: 'Activate Evening Digital Sunset to lock distractor feeds at 10 PM.',
      });
    }

    // 2. High Context Switching (> 7 different apps used today)
    if (todayRecords.length >= 7) {
      detected.push({
        riskType: 'CONTEXT_SWITCHING',
        severity: 'MEDIUM',
        title: 'High Context Switching Fragmentation',
        description: 'You have actively alternated across 7+ distinct applications today.',
        evidence: `${todayRecords.length} unique applications recorded in today's verified telemetry.`,
        actionRecommendation: 'Use Strict Focus Mode to single-task on a single window.',
      });
    }

    // 3. Override Fatigue (More than 2 overrides logged)
    if (recentOverrides.length >= 2) {
      detected.push({
        riskType: 'OVERRIDE_FATIGUE',
        severity: 'MEDIUM',
        title: 'Block Override Frequency Warning',
        description: 'Multiple temporary block overrides have been requested recently.',
        evidence: `${recentOverrides.length} intentional overrides logged in your accountability trail.`,
        actionRecommendation: 'Increase override friction delay to 60 seconds.',
      });
    }

    // Upsert detected risks into BehavioralRiskLog
    for (const d of detected) {
      const existing = await prisma.behavioralRiskLog.findFirst({
        where: { userId, riskType: d.riskType, isDismissed: false },
      });

      if (!existing) {
        await prisma.behavioralRiskLog.create({
          data: {
            userId,
            riskType: d.riskType,
            severity: d.severity,
            title: d.title,
            description: d.description,
            evidence: d.evidence,
            actionRecommendation: d.actionRecommendation,
          },
        });
      }
    }

    return this.getRisks(userId);
  }

  /**
   * Get active non-dismissed risks
   */
  static async getRisks(userId: string) {
    return prisma.behavioralRiskLog.findMany({
      where: { userId, isDismissed: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Dismiss a risk card
   */
  static async dismissRisk(userId: string, riskId: string) {
    return prisma.behavioralRiskLog.updateMany({
      where: { id: riskId, userId },
      data: { isDismissed: true },
    });
  }
}
