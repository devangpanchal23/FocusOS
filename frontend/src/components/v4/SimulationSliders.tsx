import React, { useState, useEffect } from 'react';
import { Sliders, TrendingUp, Sparkles, AlertCircle, BookmarkPlus, Check, Clock, ShieldCheck, Flame } from 'lucide-react';
import { v4Api } from '../../services/v4.service';

export const SimulationSliders: React.FC = () => {
  const [deltaSocialMinutes, setDeltaSocialMinutes] = useState(-30);
  const [extraStudyHours, setExtraStudyHours] = useState(1.0);
  const [shiftFocusHour, setShiftFocusHour] = useState(9);
  const [simulation, setSimulation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    runSim();
  }, [deltaSocialMinutes, extraStudyHours, shiftFocusHour]);

  const runSim = async () => {
    setIsLoading(true);
    try {
      const res = await v4Api.runSimulation({
        deltaSocialMinutes,
        extraStudyHours,
        shiftFocusHour,
      });
      setSimulation(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!simulation) return;
    try {
      await v4Api.saveSimulation({
        name: `Scenario: Cut Social by ${Math.abs(deltaSocialMinutes)}m, +${extraStudyHours}h Focus`,
        parameters: simulation.parameters,
        baseline: simulation.baseline,
        projected: simulation.projected,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Slider Controls Card */}
      <div className="p-6 rounded-2xl bg-[#101017] border border-[#222232] space-y-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Scenario Simulation ("What If?" Engine)</h3>
              <p className="text-xs text-zinc-400">Estimate potential attention gains and habit impact using your historical telemetry</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="py-1.5 px-3 rounded-lg bg-[#1a1a27] hover:bg-[#232334] text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition border border-[#2c2c3e]"
          >
            {savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <BookmarkPlus className="w-4 h-4 text-indigo-400" />}
            {savedSuccess ? 'Saved to Vault' : 'Save Scenario'}
          </button>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Slider 1: Social Media Reduction */}
          <div className="space-y-2 p-3.5 rounded-xl bg-[#14141f] border border-[#212132]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                Reduce Short-Form & Social
              </span>
              <span className="font-mono font-bold text-rose-400">{deltaSocialMinutes} mins/day</span>
            </div>
            <input
              type="range"
              min="-120"
              max="0"
              step="5"
              value={deltaSocialMinutes}
              onChange={(e) => setDeltaSocialMinutes(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>-120m</span>
              <span>-60m</span>
              <span>0m</span>
            </div>
          </div>

          {/* Slider 2: Extra Study & Deep Work */}
          <div className="space-y-2 p-3.5 rounded-xl bg-[#14141f] border border-[#212132]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                Extra Study / Deep Work
              </span>
              <span className="font-mono font-bold text-indigo-400">+{extraStudyHours} hrs/day</span>
            </div>
            <input
              type="range"
              min="0"
              max="4.0"
              step="0.5"
              value={extraStudyHours}
              onChange={(e) => setExtraStudyHours(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0h</span>
              <span>+2h</span>
              <span>+4h</span>
            </div>
          </div>

          {/* Slider 3: Start Time Shift */}
          <div className="space-y-2 p-3.5 rounded-xl bg-[#14141f] border border-[#212132]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Start Focus Session At
              </span>
              <span className="font-mono font-bold text-amber-400">{shiftFocusHour}:00 AM</span>
            </div>
            <input
              type="range"
              min="7"
              max="12"
              step="1"
              value={shiftFocusHour}
              onChange={(e) => setShiftFocusHour(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>7 AM</span>
              <span>9 AM</span>
              <span>12 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Projection Comparison Cards */}
      {simulation && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Attention Score Projection */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#151522] to-[#12121a] border border-[#29293e] shadow-md space-y-1">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Projected Attention Score</span>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl font-black text-white font-['Outfit']">
                {simulation.projected.attentionScore}
              </span>
              <span className="text-xs text-zinc-500 font-mono">/ 100</span>
              <span className="text-xs font-bold text-emerald-400 font-mono ml-auto">
                +{simulation.projected.attentionScore - simulation.baseline.attentionScore} pts
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">Baseline was {simulation.baseline.attentionScore}/100</p>
          </div>

          {/* Daily Screen Time */}
          <div className="p-4 rounded-xl bg-[#12121c] border border-[#212130] space-y-1">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Daily Screen Time</span>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl font-black text-white font-['Outfit']">
                {formatMinutes(simulation.projected.screenTimeMinutes)}
              </span>
              <span className="text-xs font-bold text-emerald-400 font-mono ml-auto">
                {simulation.projected.screenTimeMinutes - simulation.baseline.screenTimeMinutes < 0
                  ? `${simulation.projected.screenTimeMinutes - simulation.baseline.screenTimeMinutes}m`
                  : `+${simulation.projected.screenTimeMinutes - simulation.baseline.screenTimeMinutes}m`}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">From {formatMinutes(simulation.baseline.screenTimeMinutes)} today</p>
          </div>

          {/* Short-Form Video Saved */}
          <div className="p-4 rounded-xl bg-[#12121c] border border-[#212130] space-y-1">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Short-Form Feeds</span>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl font-black text-white font-['Outfit']">
                {formatMinutes(simulation.projected.shortFormMinutes)}
              </span>
              <span className="text-xs font-bold text-rose-400 font-mono ml-auto">
                {simulation.projected.shortFormMinutes - simulation.baseline.shortFormMinutes}m
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">Saves ~{Math.round(Math.abs(deltaSocialMinutes) * 2.8)} reel swipes</p>
          </div>

          {/* Net Weekly Hours Gained */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-[#12121a] border border-indigo-500/30 space-y-1">
            <span className="text-[11px] text-indigo-300 uppercase font-semibold tracking-wider">Weekly Output Gained</span>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl font-black text-indigo-200 font-['Outfit']">
                +{simulation.projected.netWeeklyAttentionHoursGained.toFixed(1)} hrs
              </span>
              <span className="text-xs text-indigo-400 font-mono ml-auto">per week</span>
            </div>
            <p className="text-[11px] text-indigo-400/80">Equivalent to +1 full working day</p>
          </div>
        </div>
      )}

      {/* Mandatory Disclaimer Badge */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-xs text-amber-200">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>Estimated scenario — not guaranteed outcome.</strong> Simulations are calibrated using historical telemetry elasticity models. Real outcomes vary with task complexity and daily environment.
        </span>
      </div>
    </div>
  );
};
