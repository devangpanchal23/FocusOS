import { prisma } from '../config/db.js';

export class PrivacyService {
  /**
   * Get an overview of all personal data held for the user
   */
  static async getPrivacySummary(userId: string) {
    const [
      screenshotCount,
      extractionCount,
      metricCount,
      sessionCount,
      blockRuleCount,
      auditLogs
    ] = await Promise.all([
      prisma.screenshot.count({ where: { userId } }),
      prisma.extraction.count({ where: { screenshot: { userId } } }),
      prisma.dailyMetric.count({ where: { userId } }),
      prisma.focusSession.count({ where: { userId } }),
      prisma.blockRule.count({ where: { userId } }),
      prisma.privacyAuditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    return {
      dataInventory: {
        screenshots: screenshotCount,
        extractions: extractionCount,
        dailyMetrics: metricCount,
        focusSessions: sessionCount,
        blockRules: blockRuleCount
      },
      retentionPolicy: {
        rawScreenshotsDays: 30,
        ocrAggregatesDays: 365,
        anonymizedTraining: false
      },
      encryptionStatus: {
        atRest: 'AES-256-GCM',
        inTransit: 'TLS 1.3',
        keyOwnership: 'Per-User Salted Key'
      },
      auditLogs
    };
  }

  /**
   * Record a privacy action into immutable audit trail
   */
  static async logPrivacyAction(userId: string, action: string, details: string) {
    return prisma.privacyAuditLog.create({
      data: {
        userId,
        action,
        details
      }
    });
  }

  /**
   * Selective data purge
   */
  static async purgeUserData(userId: string, scope: 'SCREENSHOTS_ONLY' | 'USAGE_METRICS_ONLY' | 'ALL_TELEMETRY') {
    let deletedDetails = '';

    if (scope === 'SCREENSHOTS_ONLY') {
      const deletedScreenshots = await prisma.screenshot.deleteMany({ where: { userId } });
      deletedDetails = `Purged ${deletedScreenshots.count} raw screenshot records and extractions.`;
    } else if (scope === 'USAGE_METRICS_ONLY') {
      const deletedMetrics = await prisma.dailyMetric.deleteMany({ where: { userId } });
      const deletedRecords = await prisma.usageRecord.deleteMany({ where: { userId } });
      deletedDetails = `Purged ${deletedMetrics.count} daily summary metrics and ${deletedRecords.count} app usage records.`;
    } else if (scope === 'ALL_TELEMETRY') {
      const s = await prisma.screenshot.deleteMany({ where: { userId } });
      const m = await prisma.dailyMetric.deleteMany({ where: { userId } });
      const u = await prisma.usageRecord.deleteMany({ where: { userId } });
      const f = await prisma.focusSession.deleteMany({ where: { userId } });
      deletedDetails = `Complete telemetry purge: ${s.count} screenshots, ${m.count} metrics, ${u.count} app logs, ${f.count} focus sessions.`;
    }

    // Log the audit event
    await this.logPrivacyAction(userId, 'DATA_PURGE', deletedDetails);

    return {
      success: true,
      scope,
      details: deletedDetails,
      purgedAt: new Date().toISOString()
    };
  }

  /**
   * Get all privacy audit logs
   */
  static async getAuditLogs(userId: string) {
    return prisma.privacyAuditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
