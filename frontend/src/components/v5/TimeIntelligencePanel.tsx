import React, { useState, useEffect } from 'react';
import { Brain, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { v5Api, TimeIntelligenceSummary } from '../../services/v5.service';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    v5Api.timeIntelligence
      .getSummary()
      .then((res) => {
        if (mounted) setSummary(res);
      })
      .catch((e: any) => {
        if (mounted) setError(e?.message || 'Time Intelligence data unavailable.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
          V5
        </span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-zinc-500">Analyzing behavioral baseline...</div>
      ) : error ? (
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
        </div>
      )}
    </div>
  );
};
