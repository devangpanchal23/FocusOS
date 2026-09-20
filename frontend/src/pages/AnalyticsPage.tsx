import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Flame,
  Calendar,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Sliders,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api.js';
import { TrendsData } from '../types/index.js';
import { ScreenTimeBarChart } from '../components/charts/ScreenTimeBarChart.js';

export const AnalyticsPage: React.FC = () => {
  const [days, setDays] = useState<number>(7);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Recovery simulator state
  const [reduceMinutes, setReduceMinutes] = useState<number>(30);
  const [selectedAllocation, setSelectedAllocation] = useState<string>('Coding');

  const fetchTrends = async (numDays: number) => {
    setIsLoading(true);
    try {
      const res = await api.getTrends(numDays);
      setTrends(res);
    } catch (err) {
      console.error('Failed to load trends:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends(days);
  }, [days]);

  // Calculations for recovery simulator
  const weeklyHoursRecovered = +((reduceMinutes * 7) / 60).toFixed(1);
  const monthlyHoursRecovered = +((reduceMinutes * 30) / 60).toFixed(1);
  const yearlyHoursRecovered = +((reduceMinutes * 365) / 60).toFixed(1);

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Behavioral Intelligence & Trends</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white font-['Outfit']">
            Attention Analytics & Recovery
          </h1>
          <p className="text-xs text-zinc-400">
            Multi-day aggregated telemetry, algorithm vulnerability patterns, and focus trajectory
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center bg-[#14141c] border border-[#272738] rounded-xl p-1 text-xs">
          <button
            onClick={() => setDays(7)}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition ${
              days === 7 ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition ${
              days === 30 ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {trends?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-[#121218] border border-[#20202c]">
            <span className="text-xs text-zinc-400 block mb-1">Total Period Screen Time</span>
            <span className="text-2xl font-black text-amber-400 font-['Outfit']">
              {trends.summary.totalScreenTime}
            </span>
            <span className="text-[11px] text-zinc-500 block mt-1">
              Avg {trends.summary.avgDailyScreenTime}/day
            </span>
          </div>

          <div className="p-5 rounded-xl bg-[#121218] border border-[#20202c]">
            <span className="text-xs text-zinc-400 block mb-1">Shorts & Reels Time</span>
            <span className="text-2xl font-black text-rose-400 font-['Outfit']">
              {trends.summary.totalShortForm}
            </span>
            <span className="text-[11px] text-zinc-500 block mt-1">
              Avg {trends.summary.avgDailyShortForm}/day
            </span>
          </div>

          <div className="p-5 rounded-xl bg-[#121218] border border-[#20202c]">
            <span className="text-xs text-zinc-400 block mb-1">Data Coverage</span>
            <span className="text-2xl font-black text-indigo-400 font-['Outfit']">
              {trends.summary.daysWithData} / {days} Days
            </span>
            <span className="text-[11px] text-emerald-400 block mt-1">
              High confidence verifiable metrics
            </span>
          </div>

          <div className="p-5 rounded-xl bg-[#121218] border border-[#20202c]">
            <span className="text-xs text-zinc-400 block mb-1">Average Flow Rating</span>
            <span className="text-2xl font-black text-emerald-400 font-['Outfit']">
              72 / 100
            </span>
            <span className="text-[11px] text-zinc-500 block mt-1">Controlled Attention</span>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white font-['Outfit']">
              Daily Telemetry Progression
            </h3>
            <p className="text-xs text-zinc-400">
              Yellow = Total Screen Time • Red = Shorts & Reels • Green = Deep Work
            </p>
          </div>
        </div>

        {trends?.trendData ? (
          <ScreenTimeBarChart data={trends.trendData} />
        ) : (
          <div className="h-64 flex items-center justify-center text-xs text-zinc-500">
            Loading telemetry trends...
          </div>
        )}
      </div>

      {/* Recovery Simulator (Signature Feature) */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#161624] via-[#12121a] to-[#141420] border border-amber-500/20 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">
              Attention Recovery Simulator
            </h3>
            <p className="text-xs text-zinc-400">
              Calculate exact hours gained back by trimming non-essential short-form scrolling
            </p>
          </div>
        </div>

        {/* Slider */}
        <div className="p-5 rounded-xl bg-[#151520] border border-[#222232] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">
              Target Daily Reduction:
            </span>
            <span className="text-lg font-black text-amber-400 font-['Outfit']">
              {reduceMinutes} minutes / day
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="120"
            step="5"
            value={reduceMinutes}
            onChange={(e) => setReduceMinutes(parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-zinc-500">
            <span>10 mins</span>
            <span>30 mins (Recommended)</span>
            <span>60 mins</span>
            <span>120 mins</span>
          </div>
        </div>

        {/* Projected Recovery Gains */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#14141e] border border-[#222232] text-center">
            <span className="text-xs text-zinc-400 block mb-1">Weekly Recovery</span>
            <span className="text-2xl font-black text-white font-['Outfit']">
              +{weeklyHoursRecovered} hrs
            </span>
            <span className="text-[11px] text-amber-400 block mt-1">Per week</span>
          </div>

          <div className="p-4 rounded-xl bg-[#14141e] border border-[#222232] text-center">
            <span className="text-xs text-zinc-400 block mb-1">Monthly Recovery</span>
            <span className="text-2xl font-black text-white font-['Outfit']">
              +{monthlyHoursRecovered} hrs
            </span>
            <span className="text-[11px] text-emerald-400 block mt-1">Per month</span>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-center">
            <span className="text-xs text-amber-300 block mb-1">Yearly Compounded Output</span>
            <span className="text-2xl font-black text-amber-400 font-['Outfit']">
              +{yearlyHoursRecovered} hrs
            </span>
            <span className="text-[11px] text-zinc-300 block mt-1">
              Equivalent to ~4.5 full 40-hr work weeks!
            </span>
          </div>
        </div>

        {/* Reallocation Target Selector */}
        <div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
            Reallocate Recovered Hours Toward:
          </span>
          <div className="flex flex-wrap gap-2">
            {['Coding & Building', 'DSA & Algorithms', 'Fitness & Gym', 'Sleep & Rest', 'Reading Books'].map(
              (target) => (
                <button
                  key={target}
                  onClick={() => setSelectedAllocation(target)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    selectedAllocation === target
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                      : 'bg-[#151520] text-zinc-300 border-[#252538] hover:border-[#35354e]'
                  }`}
                >
                  {target}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
