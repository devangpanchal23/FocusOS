import React, { useState, useEffect } from 'react';
import { Brain, AlertTriangle, TrendingUp, Clock, Settings2, Shuffle, X, Save } from 'lucide-react';
import { v5Api, TimeIntelligenceSummary, PatternCard, TimeIntelPeriod } from '../../services/v5.service';
import { PatternCards } from './PatternCards';

const SEVERITY_STYLES: Record<string, string> = {
  LOW: 'bg-brand-emerald/15 text-emerald-300 border-emerald-500/30',
  MEDIUM: 'bg-brand-amber/15 text-amber-300 border-amber-500/30',
  HIGH: 'bg-brand-rose/15 text-rose-300 border-rose-500/30',
};

function severityClass(severity?: string) {
  return SEVERITY_STYLES[severity || ''] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
}

export const TimeIntelligencePanel: React.FC = () => {
  const [summary, setSummary] = useState<TimeIntelligenceSummary | null>(null);
  const [patternCards, setPatternCards] = useState<PatternCard[]>([]);
  const [distractionWindows, setDistractionWindows] = useState<any[]>([]);
  const [contextSwitching, setContextSwitching] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [periods, setPeriods] = useState<TimeIntelPeriod[]>([]);
  const [savingPeriods, setSavingPeriods] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      v5Api.timeIntelligence.getSummary(),
      v5Api.timeIntelligence.getPatternCards(),
      v5Api.timeIntelligence.getDistractionWindows(),
      v5Api.timeIntelligence.getContextSwitching(),
      v5Api.timeIntelligence.getPreferences(),
    ]).then(([sumRes, cardsRes, dwRes, csRes, prefRes]) => {
      if (!mounted) return;
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      else setError((e) => e || sumRes.reason?.message || 'Time Intelligence data unavailable.');
      if (cardsRes.status === 'fulfilled') setPatternCards(Array.isArray(cardsRes.value) ? cardsRes.value : []);
      if (dwRes.status === 'fulfilled') setDistractionWindows(Array.isArray(dwRes.value) ? dwRes.value : []);
      if (csRes.status === 'fulfilled') setContextSwitching(Array.isArray(csRes.value) ? csRes.value : []);
      if (prefRes.status === 'fulfilled') setPeriods(prefRes.value?.periods || []);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updatePeriod = (idx: number, patch: Partial<TimeIntelPeriod>) => {
    setPeriods((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const handleSavePeriods = async () => {
    setSavingPeriods(true);
    try {
      const res = await v5Api.timeIntelligence.updatePreferences({ periods });
      setPeriods(res?.periods || periods);
      setShowSettings(false);
    } catch (e: any) {
      alert(`Failed to save periods: ${e.message}`);
    } finally {
      setSavingPeriods(false);
    }
  };

  const peakHours = summary?.peakHours || [];
  const anomalies = summary?.todaysAnomalies || [];
  const coverageDays = summary?.baselineCoverageDays ?? 0;
  const insufficientBaseline = coverageDays < 7;

  return (
    <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-['Outfit']">Personal Time Intelligence</h3>
            <p className="text-[11px] text-zinc-400">Peak hours &amp; behavioral anomalies vs. your baseline</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1c1c28] transition"
            title="Edit named time periods"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
            V5
          </span>
        </div>
      </div>

      {showSettings && (
        <div className="mb-5 p-4 rounded-xl bg-[#0d0d14] border border-indigo-500/20 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-white">Named Time Periods</p>
            <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {periods.map((p, idx) => (
            <div key={p.key || idx} className="grid grid-cols-3 gap-2 items-center text-xs">
              <input
                type="text"
                value={p.label}
                onChange={(e) => updatePeriod(idx, { label: e.target.value })}
                className="px-2 py-1.5 rounded-lg bg-[#181824] border border-[#272738] text-white text-[11px] focus:outline-none focus:border-amber-500"
              />
              <input
                type="time"
                value={p.start}
                onChange={(e) => updatePeriod(idx, { start: e.target.value })}
                className="px-2 py-1.5 rounded-lg bg-[#181824] border border-[#272738] text-white text-[11px] focus:outline-none focus:border-amber-500"
              />
              <input
                type="time"
                value={p.end}
                onChange={(e) => updatePeriod(idx, { end: e.target.value })}
                className="px-2 py-1.5 rounded-lg bg-[#181824] border border-[#272738] text-white text-[11px] focus:outline-none focus:border-amber-500"
              />
            </div>
          ))}
          {periods.length === 0 && (
            <p className="text-[11px] text-zinc-500">No period preferences loaded yet.</p>
          )}
          <button
            onClick={handleSavePeriods}
            disabled={savingPeriods || periods.length === 0}
            className="w-full mt-2 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {savingPeriods ? 'Saving...' : 'Save Periods'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-zinc-500">Analyzing behavioral baseline...</div>
      ) : error && !summary ? (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs">
          {error}
        </div>
      ) : (
        <div className="space-y-5">
          {insufficientBaseline && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-300">
              Insufficient baseline data ({coverageDays} day{coverageDays === 1 ? '' : 's'} of {'>='}7 required) —
              anomaly detection accuracy will improve as more days are tracked.
            </div>
          )}

          {/* Peak Hours */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Peak Hours
            </div>
            {peakHours.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {peakHours.map((p: any, idx: number) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#171724] border border-[#272738] text-zinc-200 font-mono flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3 text-amber-400" />
                    {typeof p === 'object' ? (p.hour ?? p.hourOfDay ?? JSON.stringify(p)) : p}
                    {typeof p === 'object' && p.label ? `: ${p.label}` : ''}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No peak-hour pattern detected yet.</p>
            )}
          </div>

          {/* Today's Anomalies */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Today's Anomalies
            </div>
            {anomalies.length > 0 ? (
              <div className="space-y-2">
                {anomalies.map((a: any, idx: number) => (
                  <div
                    key={a.id || idx}
                    className="p-3 rounded-xl bg-[#161622] border border-[#222232] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {a.scopeLabel || a.scopeId || 'Unusual activity'}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {a.direction ? `${a.direction} ` : ''}
                        {a.hourOfDay != null ? `at ${a.hourOfDay}:00` : ''}
                        {a.zScore != null ? ` • z=${Number(a.zScore).toFixed(2)}` : ''}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${severityClass(a.severity)}`}
                    >
                      {a.severity || 'INFO'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No anomalies detected today.</p>
            )}
          </div>

          {/* Pattern Cards */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              <Brain className="w-3.5 h-3.5" />
              Pattern Cards
            </div>
            <PatternCards cards={patternCards} />
          </div>

          {/* Distraction Windows + Context Switching mini-viz */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Distraction Windows
              </div>
              {distractionWindows.length > 0 ? (
                <div className="space-y-1.5">
                  {distractionWindows.slice(0, 6).map((w: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-[#161622] border border-[#222232]"
                    >
                      <span className="text-zinc-300 font-mono">
                        {w.hour != null ? `${w.hour}:00` : w.window || w.label || '—'}
                      </span>
                      <span className="text-rose-300 font-bold">
                        {w.distractionMinutes != null ? `${w.distractionMinutes}m` : w.value ?? ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No distraction windows detected yet.</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                Context Switching
              </div>
              {contextSwitching.length > 0 ? (
                <div className="flex items-end gap-1 h-20">
                  {contextSwitching.slice(0, 24).map((c: any, idx: number) => {
                    const max = Math.max(1, ...contextSwitching.map((x: any) => x.switches ?? x.count ?? 0));
                    const val = c.switches ?? c.count ?? 0;
                    const h = Math.max(4, (val / max) * 80);
                    return (
                      <div
                        key={idx}
                        title={`${c.hour != null ? `${c.hour}:00` : idx} — ${val} switches`}
                        className="flex-1 bg-indigo-500/60 rounded-t"
                        style={{ height: `${h}px` }}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No context-switching data yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
