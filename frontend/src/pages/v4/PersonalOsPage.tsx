import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Clock,
  Target,
  ArrowRight,
  Sliders,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Flame,
  Activity,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { v4Api } from '../../services/v4.service';
import { SimulationSliders } from '../../components/v4/SimulationSliders';
import { ApprovalDrawer } from '../../components/v4/ApprovalDrawer';

export const PersonalOsPage: React.FC = () => {
  const [adaptiveModel, setAdaptiveModel] = useState<any>(null);
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [coaching, setCoaching] = useState<any>(null);
  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOsData();
  }, []);

  const loadOsData = async () => {
    setIsLoading(true);
    try {
      const [modelData, corrData, approvalsData, coachingData] = await Promise.all([
        v4Api.getAdaptiveModel(),
        v4Api.getCorrelations(),
        v4Api.getPendingApprovals(),
        v4Api.getCoachingStatus(),
      ]);
      setAdaptiveModel(modelData);
      setCorrelations(corrData.correlations || []);
      setPendingApprovals(approvalsData || []);
      setCoaching(coachingData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* OS Welcome & Intelligence Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#141422] via-[#101018] to-[#12121e] border border-[#252538] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/30">
                FOCUSOS 4.0 AUTONOMOUS CORE
              </span>
              <span className="text-xs text-zinc-500">•</span>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Adaptive Agent Swarm Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
              Personal Productivity Operating System
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Dynamically observing, predicting, planning, and optimizing your digital work environment while preserving full human control.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {pendingApprovals.length > 0 && (
              <button
                onClick={() => setIsApprovalDrawerOpen(true)}
                className="py-2 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/10 transition animate-bounce"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                {pendingApprovals.length} Action Pending Review
              </button>
            )}

            <button
              onClick={loadOsData}
              className="py-2 px-3 rounded-xl bg-[#181826] hover:bg-[#202032] text-zinc-300 border border-[#2b2b3e] text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Telemetry
            </button>
          </div>
        </div>
      </div>

      {/* CORE 5-PILLAR OS HOME GRID: NOW, NEXT, INSIGHTS, RECOMMENDED, PROGRESS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. NOW WIDGET */}
        <div className="p-5 rounded-2xl bg-[#101017] border border-[#212132] shadow-md space-y-4 relative overflow-hidden group hover:border-[#303046] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              NOW • Live State
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#181824] text-zinc-400 font-mono">
              Desktop Ingestion
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-1">Deep Work Coding Block</h3>
            <p className="text-xs text-zinc-400">Current Task: Full-Stack Platform Architecture</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141420] border border-[#232336] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Current Session:</span>
              <span className="font-mono font-bold text-emerald-400">32m of 45m</span>
            </div>
            <div className="w-full bg-[#1e1e2d] h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: '71%' }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Distractions Shielded: 3</span>
              <span>Zero Overrides</span>
            </div>
          </div>
        </div>

        {/* 2. NEXT WIDGET */}
        <div className="p-5 rounded-2xl bg-[#101017] border border-[#212132] shadow-md space-y-4 relative overflow-hidden group hover:border-[#303046] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              NEXT • Upcoming Schedule
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#181824] text-zinc-400 font-mono">
              Synced with Calendar
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-1">11:00 AM — Architecture Review</h3>
            <p className="text-xs text-zinc-400">Google Meet • 45 minutes duration</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141420] border border-[#232336] space-y-2 text-xs">
            <div className="flex items-center justify-between text-zinc-300">
              <span>Subsequent Focus Slot:</span>
              <span className="font-semibold text-indigo-300">14:00 - 15:30 IST</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Planned Task:</span>
              <span className="truncate max-w-[150px]">Review CI/CD & Deploy</span>
            </div>
            <div className="pt-1 flex items-center gap-1.5 text-[10px] text-zinc-500">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Restorative break buffer inserted automatically</span>
            </div>
          </div>
        </div>

        {/* 3. INSIGHTS WIDGET (EVIDENCE-BASED) */}
        <div className="p-5 rounded-2xl bg-[#101017] border border-[#212132] shadow-md space-y-4 relative overflow-hidden group hover:border-[#303046] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              INSIGHTS • Behavioral Engine
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#181824] text-purple-300 font-mono">
              Correlation Matrix
            </span>
          </div>

          {correlations.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white leading-snug">
                {correlations[0].insight}
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {correlations[0].evidence}
              </p>
              <div className="pt-2 flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  Correlation: +{(correlations[0].correlation * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-zinc-500">High Statistical Confidence</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Analyzing past 14 days of telemetry...</p>
          )}
        </div>

        {/* 4. RECOMMENDED WIDGET */}
        <div className="p-5 rounded-2xl bg-[#101017] border border-[#212132] shadow-md space-y-4 relative overflow-hidden group hover:border-[#303046] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              RECOMMENDED • Autonomous Agent
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
              Ready to Execute
            </span>
          </div>

          <div>
            <h3 className="text-xs font-bold text-white mb-1">
              Tighten Afternoon Reel Shield (14:30 - 16:00)
            </h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Historical telemetry identifies an 82% surge in short-form scrolling between 2:30 PM and 4:00 PM. Activating a 90m preemptive shield protects 38 minutes of attention.
            </p>
          </div>

          <button
            onClick={() => setIsApprovalDrawerOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            <span>Review & Approve Proposed Shield</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5. PROGRESS WIDGET */}
        <div className="p-5 rounded-2xl bg-[#101017] border border-[#212132] shadow-md space-y-4 relative overflow-hidden group hover:border-[#303046] transition-all md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              PROGRESS • Attention & Velocity
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#181824] text-zinc-400 font-mono">
              7-Day Trajectory
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 rounded-xl bg-[#141420] border border-[#222232] space-y-1">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase">Daily Attention Score</span>
              <div className="text-2xl font-black text-white font-['Outfit'] flex items-baseline gap-1.5">
                78 <span className="text-xs text-zinc-500 font-mono">/ 100</span>
                <span className="text-xs font-bold text-emerald-400 font-mono ml-auto">+6 pts</span>
              </div>
              <p className="text-[10px] text-zinc-500">Above your 7-day average (72)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141420] border border-[#222232] space-y-1">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase">Deep Work Completed</span>
              <div className="text-2xl font-black text-white font-['Outfit'] flex items-baseline gap-1.5">
                3h 15m <span className="text-xs text-zinc-500 font-mono">/ 4h</span>
                <span className="text-xs font-bold text-indigo-400 font-mono ml-auto">81%</span>
              </div>
              <p className="text-[10px] text-zinc-500">45m remaining to daily goal</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141420] border border-[#222232] space-y-1">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase">Short-Form Curb</span>
              <div className="text-2xl font-black text-white font-['Outfit'] flex items-baseline gap-1.5">
                28m <span className="text-xs text-zinc-500 font-mono">today</span>
                <span className="text-xs font-bold text-emerald-400 font-mono ml-auto">-48%</span>
              </div>
              <p className="text-[10px] text-zinc-500">Down from 1h 14m average</p>
            </div>
          </div>
        </div>
      </div>

      {/* ADAPTIVE PERSONAL PRODUCTIVITY MODEL */}
      {adaptiveModel && (
        <div className="p-6 rounded-3xl bg-[#101018] border border-[#222234] shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
                  Adaptive Personal Productivity Model
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                    Learned from {adaptiveModel.learningIterations} Days
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  FocusOS continuously tunes focus intervals, break cadences, and peak cognitive windows to your rhythm.
                </p>
              </div>
            </div>

            <button
              onClick={() => alert(`Adaptive Model Configuration:\nOptimal Focus: ${adaptiveModel.optimalFocusMinutes}m\nOptimal Break: ${adaptiveModel.optimalBreakMinutes}m\nPeak Windows: ${adaptiveModel.peakProductivityHours.join(', ')}`)}
              className="py-1.5 px-3.5 rounded-xl bg-[#1a1a27] hover:bg-[#222235] text-zinc-200 border border-[#2b2b3e] text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Inspect & Customize Weights
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-[#141420] border border-[#222232] space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Optimal Focus Length</span>
              <div className="text-xl font-bold text-amber-400 font-mono">{adaptiveModel.optimalFocusMinutes} minutes</div>
              <p className="text-[11px] text-zinc-500">Calibrated against session interruption drop-off</p>
            </div>

            <div className="p-4 rounded-xl bg-[#141420] border border-[#222232] space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Recommended Break</span>
              <div className="text-xl font-bold text-emerald-400 font-mono">{adaptiveModel.optimalBreakMinutes} minutes</div>
              <p className="text-[11px] text-zinc-500">Restores stamina without losing task context</p>
            </div>

            <div className="p-4 rounded-xl bg-[#141420] border border-[#222232] space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Peak Energy Windows</span>
              <div className="text-xs font-bold text-indigo-300 font-mono truncate">
                {adaptiveModel.peakProductivityHours.join(', ')}
              </div>
              <p className="text-[11px] text-zinc-500">Highest concentration & zero tab switching</p>
            </div>

            <div className="p-4 rounded-xl bg-[#141420] border border-[#222232] space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Fatigue Threshold</span>
              <div className="text-xl font-bold text-purple-400 font-mono">{adaptiveModel.fatigueThresholdHours}h cumulative</div>
              <p className="text-[11px] text-zinc-500">Cognitive decay detected beyond this limit</p>
            </div>
          </div>
        </div>
      )}

      {/* EMBEDDED WHAT-IF SCENARIO SIMULATION */}
      <SimulationSliders />

      {/* HUMAN-IN-THE-LOOP APPROVAL DRAWER */}
      <ApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
        onActionComplete={loadOsData}
      />
    </div>
  );
};
