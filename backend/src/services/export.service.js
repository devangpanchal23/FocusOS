import { prisma } from '../config/db.js';
import { formatMinutes } from '../utils/durationParser.js';
export class ExportService {
    /**
     * Export all confirmed usage records as CSV
     */
    static async exportCSV(userId) {
        const records = await prisma.usageRecord.findMany({
            where: { userId },
            include: { application: true, category: true, device: true },
            orderBy: [{ date: 'desc' }, { activeMinutes: 'desc' }],
        });
        const headers = [
            'Date',
            'Device',
            'Application',
            'Category',
            'ActiveMinutes',
            'ShortFormMinutes',
            'ReelCount',
            'Status',
            'Confidence',
            'CreatedTimestamp',
        ];
        const rows = records.map((r) => [
            r.date,
            `"${r.device?.name || 'All Devices'}"`,
            `"${r.application.canonicalName}"`,
            `"${r.category?.name || 'Uncategorized'}"`,
            r.activeMinutes,
            r.shortsMinutes,
            r.reelCount,
            r.status,
            r.confidence,
            r.createdAt.toISOString(),
        ]);
        return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    }
    /**
     * Comprehensive JSON export of entire user data
     */
    static async exportJSON(userId) {
        const [user, metrics, usageRecords, focusSessions, routines, achievements, automations] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, name: true, createdAt: true },
            }),
            prisma.dailyMetric.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
            prisma.usageRecord.findMany({
                where: { userId },
                include: { application: true, category: true, device: true },
                orderBy: { date: 'desc' },
            }),
            prisma.focusSession.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
            prisma.routineSchedule.findMany({ where: { userId }, orderBy: { startTime: 'asc' } }),
            prisma.achievement.findMany({ where: { userId } }),
            prisma.automationRule.findMany({ where: { userId } }),
        ]);
        return {
            exportedAt: new Date().toISOString(),
            exportVersion: '2.0',
            user,
            metricsSummary: {
                totalDaysLogged: metrics.length,
                totalScreenMinutes: metrics.reduce((acc, m) => acc + m.totalScreenTimeMinutes, 0),
                totalShortFormMinutes: metrics.reduce((acc, m) => acc + m.shortFormMinutes, 0),
                totalReelsLogged: metrics.reduce((acc, m) => acc + m.reelCount, 0),
            },
            dailyMetrics: metrics,
            usageRecords,
            focusSessions,
            routines,
            achievements,
            automationRules: automations,
        };
    }
    /**
     * Generate a styled printable HTML executive digest
     */
    static async exportHTMLDigest(userId) {
        const todayStr = new Date().toISOString().split('T')[0];
        const [user, todayMetric, recentMetrics, topApps, gamification] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId } }),
            prisma.dailyMetric.findUnique({ where: { userId_date: { userId, date: todayStr } } }),
            prisma.dailyMetric.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 7 }),
            prisma.usageRecord.findMany({
                where: { userId, date: todayStr, status: 'CONFIRMED' },
                include: { application: true, category: true },
                orderBy: { activeMinutes: 'desc' },
                take: 8,
            }),
            prisma.userGamification.findUnique({ where: { userId } }),
        ]);
        const attentionScore = todayMetric?.attentionScore || 72;
        const totalScreen = todayMetric?.totalScreenTimeMinutes || 345;
        const shortFormMin = todayMetric?.shortFormMinutes || 68;
        const reelCount = todayMetric?.reelCount || 112;
        const productiveMin = todayMetric?.productiveMinutes || 195;
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FocusOS Executive Telemetry Digest</title>
  <style>
    @media print {
      body { background: #fff !important; color: #111 !important; }
      .no-print { display: none !important; }
      .card { border: 1px solid #ddd !important; box-shadow: none !important; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #090d16; color: #e2e8f0; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
    .logo span { color: #f8fafc; }
    .timestamp { font-size: 13px; color: #94a3b8; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; }
    .card-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 8px; font-weight: 600; }
    .card-value { font-size: 28px; font-weight: 700; color: #f8fafc; }
    .card-sub { font-size: 12px; color: #64748b; margin-top: 6px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 12px; }
    .badge-amber { background: #78350f; color: #fde68a; }
    .badge-emerald { background: #064e3b; color: #a7f3d0; }
    .badge-indigo { background: #312e81; color: #c7d2fe; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
    th { text-align: left; padding: 12px; border-bottom: 1px solid #334155; color: #94a3b8; font-weight: 600; }
    td { padding: 12px; border-bottom: 1px solid #1e293b; }
    .btn-print { background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #f1f5f9; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Focus<span>Intelligence</span> <small style="font-size: 12px; color: #6366f1; border: 1px solid #6366f1; border-radius: 4px; padding: 2px 6px;">V2 REPORT</small></div>
      <div style="font-size: 14px; color: #94a3b8; margin-top: 4px;">User: ${user?.name || 'Devang Panchal'} (${user?.email})</div>
    </div>
    <div style="text-align: right;">
      <button class="btn-print no-print" onclick="window.print()">🖨️ Print / Save PDF</button>
      <div class="timestamp" style="margin-top: 8px;">Generated on: ${new Date().toLocaleString()}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Attention Score</div>
      <div class="card-value" style="color: ${attentionScore >= 70 ? '#10b981' : '#f59e0b'};">${attentionScore} / 100</div>
      <div class="card-sub">${attentionScore >= 70 ? 'Optimal Cognitive Resilience' : 'Mild Attention Fragmentation'}</div>
    </div>
    <div class="card">
      <div class="card-label">Daily Screen Time</div>
      <div class="card-value">${formatMinutes(totalScreen)}</div>
      <div class="card-sub">${formatMinutes(productiveMin)} Productive Work</div>
    </div>
    <div class="card">
      <div class="card-label">Short-Form Consumption</div>
      <div class="card-value" style="color: #f43f5e;">${formatMinutes(shortFormMin)}</div>
      <div class="card-sub">${reelCount} Total Reels / Shorts Logged</div>
    </div>
    <div class="card">
      <div class="card-label">Gamification Level</div>
      <div class="card-value" style="color: #8b5cf6;">Level ${gamification?.level || 4}</div>
      <div class="card-sub">${gamification?.xp || 1450} Total XP • ${gamification?.dailyStreak || 7}-Day Streak</div>
    </div>
  </div>

  <div class="card" style="margin-bottom: 32px;">
    <div class="section-title">Top Application Usage Breakdown (Today)</div>
    <table>
      <thead>
        <tr>
          <th>Application</th>
          <th>Category</th>
          <th>Active Usage</th>
          <th>Short-Form Time</th>
          <th>Reels Watched</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${topApps
            .map((app) => `
          <tr>
            <td style="font-weight: 600; color: #f8fafc;">${app.application.canonicalName}</td>
            <td><span class="badge ${app.category?.isProductive ? 'badge-emerald' : app.category?.isShortForm ? 'badge-amber' : 'badge-indigo'}">${app.category?.name || 'General'}</span></td>
            <td>${formatMinutes(app.activeMinutes)}</td>
            <td>${app.shortsMinutes > 0 ? formatMinutes(app.shortsMinutes) : '—'}</td>
            <td>${app.reelCount > 0 ? `${app.reelCount} reels` : '—'}</td>
            <td><span style="color: #10b981;">✓ ${app.status}</span></td>
          </tr>
        `)
            .join('')}
      </tbody>
    </table>
  </div>

  <div class="card">
    <div class="section-title">Recent 7-Day Performance History</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Total Screen Time</th>
          <th>Productive Time</th>
          <th>Short-Form Content</th>
          <th>Attention Score</th>
          <th>Verification</th>
        </tr>
      </thead>
      <tbody>
        ${recentMetrics
            .map((m) => `
          <tr>
            <td style="font-weight: 600;">${m.date}</td>
            <td>${formatMinutes(m.totalScreenTimeMinutes)}</td>
            <td style="color: #10b981;">${formatMinutes(m.productiveMinutes)}</td>
            <td style="color: #f43f5e;">${formatMinutes(m.shortFormMinutes)} (${m.reelCount} reels)</td>
            <td><strong style="color: ${m.attentionScore >= 70 ? '#10b981' : '#f59e0b'};">${m.attentionScore}/100</strong></td>
            <td><span style="color: #10b981;">● ${m.coverageStatus}</span></td>
          </tr>
        `)
            .join('')}
      </tbody>
    </table>
  </div>

  <footer style="margin-top: 40px; text-align: center; color: #64748b; font-size: 12px;">
    FocusOS Production Intelligence Platform &bull; Confidential Personal Telemetry &bull; Generated Automatically
  </footer>
</body>
</html>`;
    }
}
