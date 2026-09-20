import React, { useState, useEffect } from 'react';
import { Sliders, Sparkles, TrendingUp, AlertOctagon, CheckCircle2, Bookmark, Clock, Flame } from 'lucide-react';
import { v4Api } from '../../services/v4.service';
import { SimulationSliders } from '../../components/v4/SimulationSliders';

export const SimulationsPage: React.FC = () => {
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [savedSimulations, setSavedSimulations] = useState<any[]>([]);
  const [sleepSchedule, setSleepSchedule] = useState<string>('23:30 - 07:00');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [corrData, savedData] = await Promise.all([
        v4Api.getCorrelations(),
        v4Api.getSavedSimulations(),
      ]);
      setCorrelations(corrData.correlations || []);
      setSleepSchedule(corrData.sleepSchedule || '23:30 - 07:00');
      setSavedSimulations(savedData || []);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            PHASE 9–10 ENGINE
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Next-Gen Predictive Simulation</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
          Scenario Simulation & Behavioral Intelligence
        </h1>
        <p className="text-sm text-zinc-400">
          Simulate behavioral adjustments ("What If?") and explore empirical telemetry correlations without inferring sensitive attributes.
        </p>
      </div>

      {/* Interactive Simulation Sliders */}
      <SimulationSliders />

      {/* Next-Gen Behavioral Correlation Matrix */}
      <div className="p-6 rounded-3xl bg-[#101018] border border-[#212132] space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-['Outfit']">
                Next-Gen Multi-Variable Correlation Matrix
              </h3>
              <p className="text-xs text-zinc-400">Empirically derived from your activity, sleep schedule ({sleepSchedule}), and focus logs</p>
            </div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded bg-[#181826] text-zinc-400 font-mono">
            Zero Sensitive Inferences Policy
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {correlations.map((corr, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-[#13131e] border border-[#232336] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-200">{corr.factorA} ↔ {corr.factorB}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  corr.impact === 'POSITIVE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  r = {corr.correlation > 0 ? `+${corr.correlation}` : corr.correlation}
                </span>
              </div>

              <p className="text-zinc-300 leading-relaxed font-sans">{corr.insight}</p>

              <div className="pt-2 border-t border-[#1b1b28] flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                <span>{corr.evidence}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Scenarios Table */}
      {savedSimulations.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#101018] border border-[#212132] space-y-4 shadow-md">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
              Saved Simulation Scenarios ({savedSimulations.length})
            </h3>
          </div>

          <div className="divide-y divide-[#1b1b28]">
            {savedSimulations.map((sim) => {
              let projected: any = {};
              try {
                projected = JSON.parse(sim.projectedMetricsJson);
              } catch {
                projected = {};
              }

              return (
                <div key={sim.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-white">{sim.name}</p>
                    <p className="text-[11px] text-zinc-400">
                      Projected Attention: <span className="text-emerald-400 font-semibold">{projected.attentionScore}/100</span> • Output Gained: <span className="text-indigo-300 font-semibold">+{projected.netWeeklyAttentionHoursGained?.toFixed(1) || 7.5} hrs/wk</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {new Date(sim.createdAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
