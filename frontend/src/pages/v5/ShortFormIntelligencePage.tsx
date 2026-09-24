import React, { useState, useEffect } from 'react';
import { Flame, Clock, Calendar, TrendingUp, Repeat, Database, AlertCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  v5Api,
  ShortFormHotspots,
  ShortFormHeatmapCell,
  ShortFormPlatform,
  ShortFormLoop,
} from '../../services/v5.service';

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: '#f43f5e',
  YOUTUBE: '#ef4444',
  SNAPCHAT: '#eab308',
  FACEBOOK: '#6366f1',
  OTHER: '#71717a',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function platformColor(p: string) {
  return PLATFORM_COLORS[p?.toUpperCase()] || '#6366f1';
}

export const ShortFormIntelligencePage: React.FC = () => {
  const [hotspots, setHotspots] = useState<ShortFormHotspots | null>(null);
  const [heatmap, setHeatmap] = useState<ShortFormHeatmapCell[] | null>(null);
  const [heatmapInsufficient, setHeatmapInsufficient] = useState(false);
  const [platforms, setPlatforms] = useState<ShortFormPlatform[]>([]);
  const [weekly, setWeekly] = useState<any>(null);
  const [monthly, setMonthly] = useState<any>(null);
  const [loops, setLoops] = useState<ShortFormLoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      v5Api.shortForm.getHotspots(),
      v5Api.shortForm.getHeatmap(),
      v5Api.shortForm.getPlatforms(),
      v5Api.shortForm.getWeekly(),
      v5Api.shortForm.getMonthly(),
      v5Api.shortForm.getLoops(),
    ]).then(([hsRes, hmRes, plRes, wkRes, moRes, loopRes]) => {
      if (!mounted) return;
      if (hsRes.status === 'fulfilled') setHotspots(hsRes.value);
      if (hmRes.status === 'fulfilled') {
        const val = hmRes.value as any;
        if (Array.isArray(val)) setHeatmap(val);
        else if (val?.insufficientData) setHeatmapInsufficient(true);
      }
      if (plRes.status === 'fulfilled') setPlatforms(Array.isArray(plRes.value) ? plRes.value : []);
      if (wkRes.status === 'fulfilled') setWeekly(wkRes.value);
      if (moRes.status === 'fulfilled') setMonthly(moRes.value);
      if (loopRes.status === 'fulfilled') setLoops(Array.isArray(loopRes.value) ? loopRes.value : []);

      if ([hsRes, hmRes, plRes, wkRes, moRes, loopRes].every((r) => r.status === 'rejected')) {
        setError('Unable to reach Short-Form Intelligence services yet.');
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const maxHeatVal = Math.max(1, ...(heatmap || []).map((c) => c.minutes || 0));

  const weeklyRows: { day: string; minutes: number }[] = Array.isArray(weekly)
    ? weekly
    : weekly?.days || weekly?.weekdays || [];

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
            V5.1 SHORT-FORM INTELLIGENCE
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
          Short-Form Intelligence
        </h1>
        <p className="text-sm text-zinc-400">
          Reels, Shorts, and Snaps analytics across Instagram, YouTube, Snapchat, and Facebook — grounded in real
          session data where available.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-zinc-500">Loading short-form telemetry...</div>
      ) : (
        <>
          {/* Hotspot cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#121218] border border-[#20202c] flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 uppercase tracking-wide">Highest Hour</p>
                <p className="text-xl font-bold text-white font-mono">
                  {hotspots?.highestHour != null ? `${hotspots.highestHour}:00` : '—'}
                </p>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-[#121218] border border-[#20202c] flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 uppercase tracking-wide">Highest Day</p>
                <p className="text-xl font-bold text-white">{hotspots?.highestDay || '—'}</p>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-[#121218] border border-[#20202c] flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                <Flame className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 uppercase tracking-wide">Highest Period</p>
                <p className="text-xl font-bold text-white">{hotspots?.highestPeriod || '—'}</p>
              </div>
            </div>
          </div>

          {/* Platform comparison */}
          <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white font-['Outfit']">Platform Comparison</h3>
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <Database className="w-3 h-3" /> Session &amp; estimated data mixed per platform
              </span>
            </div>
            {platforms.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={platforms}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#242436" />
                    <XAxis dataKey="platform" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: '#18181f', border: '1px solid #272732', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#e4e4e7' }}
                    />
                    <Bar dataKey="totalMinutes" radius={[6, 6, 0, 0]}>
                      {platforms.map((p, idx) => (
                        <Cell key={idx} fill={platformColor(p.platform)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {platforms.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#161622] border border-[#222232] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: platformColor(p.platform) }} />
                        <span className="text-xs font-semibold text-white truncate">{p.platform}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 shrink-0">
                        <span className="font-mono text-white">{p.totalMinutes}m</span>
                        <span>{p.sessionCount} sessions</span>
                        {p.dataQualityMix && Object.entries(p.dataQualityMix).map(([q, count]) => (
                          <span
                            key={q}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              q === 'SESSION_LEVEL'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {q === 'SESSION_LEVEL' ? 'Session-level' : 'Estimated'}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-zinc-500">
                No short-form platform data recorded yet.
              </div>
            )}
          </div>

          {/* Heatmap */}
          <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white font-['Outfit']">Hour &times; Day Heatmap</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                Session-level data only
              </span>
            </div>
            {heatmapInsufficient ? (
              <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-xl flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Insufficient session-level data to build an hourly heatmap yet.
              </div>
            ) : heatmap && heatmap.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="grid" style={{ gridTemplateColumns: `40px repeat(24, minmax(18px, 1fr))`, gap: '2px' }}>
                  <div />
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="text-[8px] text-zinc-600 text-center font-mono">{h}</div>
                  ))}
                  {DAYS.map((day) => (
                    <React.Fragment key={day}>
                      <div className="text-[10px] text-zinc-500 flex items-center">{day}</div>
                      {Array.from({ length: 24 }, (_, h) => {
                        const cell = heatmap.find((c) => c.day === day && c.hour === h);
                        const intensity = cell ? Math.max(0.12, cell.minutes / maxHeatVal) : 0.05;
                        return (
                          <div
                            key={h}
                            title={`${day} ${h}:00 — ${cell?.minutes || 0}m`}
                            className="aspect-square rounded-sm"
                            style={{ backgroundColor: `rgba(244, 63, 94, ${intensity})` }}
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-xs text-zinc-500">
                No hourly session-level data available yet.
              </div>
            )}
          </div>

          {/* Weekly + Monthly */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white font-['Outfit']">Weekly Pattern</h3>
              </div>
              {weeklyRows.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#242436" />
                    <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: '#18181f', border: '1px solid #272732', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#e4e4e7' }}
                    />
                    <Bar dataKey="minutes" radius={[6, 6, 0, 0]} fill="#f43f5e" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-32 flex items-center justify-center text-xs text-zinc-500">
                  No weekly pattern data yet.
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white font-['Outfit']">Monthly Trend</h3>
              </div>
              {monthly ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#161622] border border-[#222232]">
                    <span className="text-[10px] text-zinc-500 uppercase block">Total Minutes</span>
                    <span className="font-bold text-white font-mono">{monthly.totalMinutes ?? '—'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#161622] border border-[#222232]">
                    <span className="text-[10px] text-zinc-500 uppercase block">Session Count</span>
                    <span className="font-bold text-white font-mono">{monthly.sessionCount ?? '—'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#161622] border border-[#222232]">
                    <span className="text-[10px] text-zinc-500 uppercase block">Item Count</span>
                    <span className="font-bold text-white font-mono">{monthly.itemCount ?? '—'}</span>
                  </div>
                  {monthly.platformBreakdown && (
                    <div className="p-3 rounded-xl bg-[#161622] border border-[#222232] col-span-2">
                      <span className="text-[10px] text-zinc-500 uppercase block mb-1">Platform Breakdown</span>
                      <div className="space-y-1">
                        {Object.entries(monthly.platformBreakdown as Record<string, number>).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between">
                            <span className="text-zinc-300">{k}</span>
                            <span className="text-white font-mono">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-xs text-zinc-500">
                  No monthly trend data yet.
                </div>
              )}
            </div>
          </div>

          {/* Repeated loops */}
          <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
            <div className="flex items-center gap-2 mb-2">
              <Repeat className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-bold text-white font-['Outfit']">Detected Behavioral Sequences</h3>
            </div>
            <p className="text-[11px] text-zinc-500 mb-4">
              Repeated app/domain sequences mined from session ordering. This describes correlation in observed
              behavior only — it is not a causal claim.
            </p>
            {loops.length > 0 ? (
              <div className="space-y-2">
                {loops.map((loop, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#161622] border border-[#222232] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {loop.sequence.map((step, i) => (
                        <React.Fragment key={i}>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#1c1c28] border border-[#272738] text-zinc-200 font-mono">
                            {step}
                          </span>
                          {i < loop.sequence.length - 1 && <span className="text-zinc-600">&rarr;</span>}
                        </React.Fragment>
                      ))}
                    </div>
                    <span className="text-xs font-bold font-mono text-amber-300 shrink-0">{loop.occurrences}&times;</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-xl">
                No repeated behavioral sequences detected yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
