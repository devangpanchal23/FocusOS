import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { v4Api } from '../../services/v4.service';

export const ReflectionsPage: React.FC = () => {
  const [activePeriod, setActivePeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [reflections, setReflections] = useState<any[]>([]);
  const [coaching, setCoaching] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Journal form state
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatDistracted, setWhatDistracted] = useState('');
  const [improvementGoal, setImprovementGoal] = useState('');
  const [proudOf, setProudOf] = useState('');

  useEffect(() => {
    loadData();
  }, [activePeriod]);

  const loadData = async () => {
    try {
      const [refData, coachData] = await Promise.all([
        v4Api.getReflections(activePeriod),
        v4Api.getCoachingStatus(),
      ]);
      setReflections(refData || []);
      setCoaching(coachData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatWentWell.trim()) return;
    setIsSubmitting(true);
    try {
      await v4Api.submitReflection({
        periodType: activePeriod,
        whatWentWell,
        whatDistracted,
        improvementGoal,
        proudOf,
      });
      setWhatWentWell('');
      setWhatDistracted('');
      setImprovementGoal('');
      setProudOf('');
      await loadData();
    } catch (e: any) {
      alert(`Submission error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              PHASE 14–15 INTELLIGENCE
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400">Coaching & Synthesis</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
            AI Reflection & Goal Coaching
          </h1>
          <p className="text-sm text-zinc-400">
            Structured daily and weekly reflection journals with recurring theme extraction and continuous goal pacing adjustments.
          </p>
        </div>

        {/* Period Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#14141f] border border-[#242436]">
          {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activePeriod === p
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* CONTINUOUS GOAL COACHING CARDS */}
      {coaching && coaching.goals?.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#101018] border border-[#222234] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-['Outfit']">
                  Continuous AI Goal Coaching
                </h3>
                <p className="text-xs text-zinc-400">Analyzing goal velocity, detecting blockers, and proposing frictionless adjustments</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              {coaching.activeGoalsCount} Goals Monitored
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {coaching.goals.map((g: any) => (
              <div key={g.id} className="p-4 rounded-2xl bg-[#141420] border border-[#232336] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100">{g.title}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    g.isAtRisk
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {g.progressPercent}% Complete
                  </span>
                </div>

                <div className="text-[11px] text-zinc-400 flex items-start gap-1.5">
                  <span className="text-zinc-500 font-semibold shrink-0">Blocker:</span>
                  <span>{g.detectedBlocker}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#0e0e16] border border-[#1e1e2d] text-[11px] text-indigo-300 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{g.aiNextAction}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JOURNAL FORM */}
      <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-[#111119] border border-[#242436] space-y-5 shadow-xl">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white font-['Outfit']">
            {activePeriod} Productivity Reflection Journal
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">1. What went exceptionally well?</label>
            <textarea
              value={whatWentWell}
              onChange={(e) => setWhatWentWell(e.target.value)}
              placeholder="e.g., Unbroken 90-minute coding sprint without any tab switching..."
              rows={3}
              className="w-full bg-[#0c0c12] border border-[#202030] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">2. What caused friction or distraction?</label>
            <textarea
              value={whatDistracted}
              onChange={(e) => setWhatDistracted(e.target.value)}
              placeholder="e.g., 25-minute YouTube spiral during post-lunch slump..."
              rows={3}
              className="w-full bg-[#0c0c12] border border-[#202030] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">3. What is your single improvement goal for next period?</label>
            <textarea
              value={improvementGoal}
              onChange={(e) => setImprovementGoal(e.target.value)}
              placeholder="e.g., Take an offline walk at 2 PM instead of browsing..."
              rows={3}
              className="w-full bg-[#0c0c12] border border-[#202030] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">4. What accomplishment are you proud of?</label>
            <textarea
              value={proudOf}
              onChange={(e) => setProudOf(e.target.value)}
              placeholder="e.g., Kept daily focus streak unbroken for 7 consecutive days..."
              rows={3}
              className="w-full bg-[#0c0c12] border border-[#202030] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'Synthesizing Reflection...' : `Submit ${activePeriod} Reflection`}
          </button>
        </div>
      </form>

      {/* PAST REFLECTIONS WITH AI SYNTHESIS */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
          Historical Reflections & Theme Syntheses ({reflections.length})
        </h3>

        <div className="space-y-4">
          {reflections.map((r) => (
            <div key={r.id} className="p-6 rounded-3xl bg-[#101018] border border-[#212132] space-y-4 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1b1b28]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white font-mono">{r.date}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#181826] text-zinc-400 font-mono">
                    {r.periodType}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.recurringThemes?.map((theme: string, tIdx: number) => (
                    <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">
                      #{theme}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#141420] border border-[#1f1f2e]">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Went Well</span>
                  <p className="text-zinc-200 mt-1">{r.responses?.whatWentWell}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#141420] border border-[#1f1f2e]">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Distraction / Friction</span>
                  <p className="text-zinc-200 mt-1">{r.responses?.whatDistracted || 'None recorded'}</p>
                </div>
              </div>

              {/* AI Synthesis Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/20 to-purple-950/20 border border-indigo-500/30 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Reflection Synthesis & Momentum Guidance</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">{r.aiSynthesis}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
