import React, { useState, useEffect } from 'react';
import {
  Clock,
  Flame,
  Target,
  Sparkles,
  Smartphone,
  Bell,
  Unlock,
  Layers,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api.js';
import { DailyOverview, TrendsData } from '../types/index.js';
import { Header } from '../components/layout/Header.js';
import { StatCard } from '../components/common/StatCard.js';
import { AttentionScoreModal } from '../components/common/AttentionScoreModal.js';
import { ScrollCostModal } from '../components/common/ScrollCostModal.js';
import { ScreenTimeBarChart } from '../components/charts/ScreenTimeBarChart.js';
import { CategoryDonutChart } from '../components/charts/CategoryDonutChart.js';
import { HourlyActivityChart } from '../components/charts/HourlyActivityChart.js';
import { DeviceBarChart } from '../components/charts/DeviceBarChart.js';
import { InsightBanner } from '../components/common/InsightBanner';
import { TimeIntelligencePanel } from '../components/v5/TimeIntelligencePanel';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [overview, setOverview] = useState<DailyOverview | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);
  const [showScrollCostModal, setShowScrollCostModal] = useState<boolean>(false);

  const fetchData = async (date: string) => {
    setIsLoading(true);
    try {
      const [overviewRes, trendsRes] = await Promise.all([
        api.getOverview(date),
        api.getTrends(7),
      ]);
      setOverview(overviewRes);
      setTrends(trendsRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  if (isLoading && !overview) {
    return (
      <div className="flex-1 flex flex-col">
        <Header selectedDate={selectedDate} onDateChange={setSelectedDate} />
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
            <p className="text-xs text-zinc-400 font-medium">Synthesizing multi-device digital telemetry...</p>
          </div>
        </div>
      </div>
    );
  }

  const metrics = overview?.metrics;

  return (
    <div className="flex-1 flex flex-col pb-16">
      <Header
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onRefresh={() => fetchData(selectedDate)}
      />

      <main className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Dynamic Behavioral Intelligence Banner */}
        <InsightBanner />

        {/* Top 6 Overview Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Screen Time"
            value={metrics?.screenTime.formatted || '0m'}
            icon={Clock}
            iconColor="text-amber-400"
            diffText={
              metrics?.screenTime.diffMinutes
                ? `${metrics.screenTime.diffMinutes > 0 ? '+' : ''}${metrics.screenTime.diffFormatted} vs yesterday`
                : undefined
            }
            isDiffPositive={!metrics?.screenTime.isHigher}
          />

          <StatCard
            title="Shorts & Reels"
            value={metrics?.shortForm.formatted || '0m'}
            icon={Flame}
            iconColor="text-rose-400"
            badgeText={metrics?.shortForm.reelCount ? `${metrics.shortForm.reelCount} Reels` : undefined}
            diffText={
              metrics?.shortForm.diffMinutes
                ? `${metrics.shortForm.diffMinutes > 0 ? '+' : ''}${metrics.shortForm.diffFormatted} vs yesterday`
                : undefined
            }
            isDiffPositive={!(metrics?.shortForm.diffMinutes && metrics.shortForm.diffMinutes > 0)}
          />

          <StatCard
            title="Attention Score"
            value={metrics?.attentionScore.score ? `${metrics.attentionScore.score}/100` : '50/100'}
            icon={Sparkles}
            iconColor="text-indigo-400"
            subtitle="Click to view factors"
            onClick={() => setShowScoreModal(true)}
          />

          <StatCard
            title="Focused Work"
            value={metrics?.focusTime.formatted || '0m'}
            icon={Target}
            iconColor="text-emerald-400"
            subtitle="Dev & Productivity"
          />

          <StatCard
            title="Phone Unlocks"
            value={metrics?.unlocks ? metrics.unlocks.toString() : '0'}
            icon={Unlock}
            iconColor="text-cyan-400"
            subtitle="Check-in frequency"
          />

          <StatCard
            title="Notifications"
            value={metrics?.notifications ? metrics.notifications.toString() : '0'}
            icon={Bell}
            iconColor="text-purple-400"
            subtitle="Pings & alerts"
          />
        </div>

        {/* Scroll Cost Banner & Opportunity Cost */}
        {metrics?.scrollCost && metrics.scrollCost.minutes > 0 && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/30 via-[#181822] to-amber-950/20 border border-rose-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-['Outfit']">
                    Short-Form Scroll Cost: {metrics.scrollCost.formatted} lost today
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                    {metrics.shortForm.percentageOfScreenTime}% of screen time
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Equivalent to{' '}
                  <span className="text-amber-400 font-semibold">
                    {metrics.scrollCost.hours} hours of deep learning
                  </span>{' '}
                  or ~{Math.round(metrics.scrollCost.minutes / 90 * 10) / 10} coding blocks.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowScrollCostModal(true)}
              className="px-4 py-2 rounded-xl bg-[#20202c] hover:bg-[#282838] border border-[#2f2f42] text-xs font-semibold text-zinc-200 hover:text-white transition flex items-center gap-1.5 shrink-0"
            >
              <span>View Cost Breakdown</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Middle Section: Screen Time Trend Chart & Peak Hotspot Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 7-Day Screen Time Chart */}
          <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">
                  7-Day Screen Time & Short-Form Trend
                </h3>
                <p className="text-xs text-zinc-400">
                  Daily comparison of total usage, reels scrolling, and deep work
                </p>
              </div>
              {trends?.summary && (
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                  Avg: {trends.summary.avgDailyScreenTime}/day
                </span>
              )}
            </div>
            {trends?.trendData ? (
              <ScreenTimeBarChart data={trends.trendData} />
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-zinc-500">
                No trend telemetry available.
              </div>
            )}
          </div>

          {/* Hourly Hotspots Chart */}
          <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">
                  24-Hour Attention Flow & Hotspots
                </h3>
                <p className="text-xs text-zinc-400">
                  Exact hours of highest scrolling vulnerability vs deep work
                </p>
              </div>
            </div>
            <HourlyActivityChart />
          </div>
        </div>

        {/* Bottom Section: Top Applications & Category / Device Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Applications (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">
                  Application Breakdown
                </h3>
                <p className="text-xs text-zinc-400">
                  Ranked by active usage duration with background metrics
                </p>
              </div>
              <span className="text-xs text-zinc-400">
                {overview?.topApps.length || 0} active apps detected
              </span>
            </div>

            <div className="space-y-3">
              {overview?.topApps.map((app, i) => (
                <div
                  key={app.id || i}
                  className="p-3.5 rounded-xl bg-[#161622] border border-[#222232] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-zinc-500 w-4">
                      0{i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">
                          {app.name}
                        </span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-md font-semibold border"
                          style={{
                            backgroundColor: `${app.categoryColor}15`,
                            color: app.categoryColor,
                            borderColor: `${app.categoryColor}30`,
                          }}
                        >
                          {app.category}
                        </span>
                        {app.reelCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                            {app.reelCount} Reels
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">
                        {app.deviceName}
                        {app.backgroundMinutes > 0 && ` • ${app.backgroundFormatted} background`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                    <div className="w-24 sm:w-32 bg-[#232332] h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(5, app.percentage))}%`,
                          backgroundColor: app.categoryColor,
                        }}
                      ></div>
                    </div>
                    <div className="text-right w-16">
                      <span className="text-xs font-bold font-mono text-white block">
                        {app.activeFormatted}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {app.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {(!overview?.topApps || overview.topApps.length === 0) && (
                <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-xl">
                  No application usage records recorded for this day yet.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Category Donut & Devices */}
          <div className="space-y-6">
            {/* Category Donut */}
            <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
              <h3 className="text-base font-bold text-white font-['Outfit'] mb-1">
                Category Distribution
              </h3>
              <p className="text-xs text-zinc-400 mb-2">Proportion of daily screen time</p>
              {overview?.categoryBreakdown && (
                <CategoryDonutChart categories={overview.categoryBreakdown} />
              )}
            </div>

            {/* Devices Breakdown */}
            <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white font-['Outfit']">
                  Devices Synced
                </h3>
                <button
                  onClick={() => navigate('/devices')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                >
                  Manage
                </button>
              </div>
              {overview?.deviceBreakdown && (
                <DeviceBarChart devices={overview.deviceBreakdown} />
              )}
            </div>
          </div>
        </div>

        {/* V5 Personal Time Intelligence */}
        <TimeIntelligencePanel />
      </main>

      {/* Modals */}
      {overview && (
        <AttentionScoreModal
          isOpen={showScoreModal}
          onClose={() => setShowScoreModal(false)}
          score={metrics?.attentionScore.score || 50}
          factors={metrics?.attentionScore.breakdown.factors || []}
        />
      )}

      {metrics?.scrollCost && (
        <ScrollCostModal
          isOpen={showScrollCostModal}
          onClose={() => setShowScrollCostModal(false)}
          scrollCost={metrics.scrollCost}
        />
      )}
    </div>
  );
};
