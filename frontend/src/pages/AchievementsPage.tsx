import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Zap, Award, ShieldCheck, Crosshair, Cpu, CheckCircle2, Lock, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { UserGamification, Achievement } from '../types';

export const AchievementsPage: React.FC = () => {
  const [gamification, setGamification] = useState<UserGamification | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getGamification();
      setGamification(data);
    } catch (err) {
      console.error('Failed to load gamification data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCheckNow = async () => {
    try {
      setChecking(true);
      const data = await api.checkAchievements();
      setGamification(data);
    } catch (err) {
      console.error('Failed to check achievements:', err);
    } finally {
      setChecking(false);
    }
  };

  const getAchievementIcon = (iconName: string, unlocked: boolean) => {
    const cls = `w-6 h-6 ${unlocked ? 'text-amber-400' : 'text-slate-600'}`;
    switch (iconName) {
      case 'Zap':
        return <Zap className={cls} />;
      case 'Flame':
        return <Flame className={cls} />;
      case 'ShieldCheck':
        return <ShieldCheck className={cls} />;
      case 'Crosshair':
        return <Crosshair className={cls} />;
      case 'Cpu':
        return <Cpu className={cls} />;
      default:
        return <Award className={cls} />;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-amber-400 fill-amber-400/20" />
            Gamification & Achievements
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Turn behavioral self-control into progression. Earn XP, maintain consistency streaks, and unlock milestones.
          </p>
        </div>

        <button
          onClick={handleCheckNow}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-medium text-xs transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-amber-400 ${checking ? 'animate-spin' : ''}`} />
          <span>{checking ? 'Checking Milestones...' : 'Evaluate Progress'}</span>
        </button>
      </div>

      {/* Gamification Hero Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {/* Level Circle */}
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-1 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Level</span>
                <span className="text-3xl font-black text-white">{gamification?.level || 4}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">Attention Architect</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {gamification?.xp || 1450} Total XP
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Progress towards Level {(gamification?.level || 4) + 1}:
              </p>

              {/* Progress Bar */}
              <div className="mt-3 w-72 sm:w-80">
                <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                  <span>{gamification?.progressPercent || 62}%</span>
                  <span>{gamification?.nextLevelXpCeil || 1600} XP Target</span>
                </div>
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full transition-all duration-1000"
                    style={{ width: `${gamification?.progressPercent || 62}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Streaks Highlights */}
          <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="flex items-center justify-center text-amber-400 mb-1">
                <Flame className="w-5 h-5 fill-current animate-pulse" />
              </div>
              <div className="text-xl font-black text-white">{gamification?.dailyStreak || 7}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Day Streak</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="flex items-center justify-center text-indigo-400 mb-1">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div className="text-xl font-black text-white">{gamification?.focusStreak || 5}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Focus Streak</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
              <div className="flex items-center justify-center text-purple-400 mb-1">
                <Trophy className="w-5 h-5 fill-current" />
              </div>
              <div className="text-xl font-black text-white">{gamification?.longestStreak || 12}</div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Best Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Showcase */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" /> Milestone Badges
          </h3>
          <span className="text-xs text-slate-500">
            {gamification?.achievements?.filter((a) => a.isUnlocked).length || 0} of{' '}
            {gamification?.achievements?.length || 0} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gamification?.achievements?.map((ach) => (
            <div
              key={ach.id}
              className={`p-5 rounded-2xl border transition relative flex flex-col justify-between ${
                ach.isUnlocked
                  ? 'bg-slate-900/90 border-amber-500/30 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-3 rounded-2xl border ${
                      ach.isUnlocked
                        ? 'bg-amber-500/10 border-amber-500/30 shadow-inner'
                        : 'bg-slate-800/60 border-slate-700'
                    }`}
                  >
                    {getAchievementIcon(ach.icon, ach.isUnlocked)}
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      ach.isUnlocked
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    +{ach.xpReward} XP
                  </span>
                </div>

                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  {ach.title}
                  {!ach.isUnlocked && <Lock className="w-3.5 h-3.5 text-slate-500" />}
                </h4>

                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ach.description}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between">
                {ach.isUnlocked ? (
                  <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
                  </span>
                ) : (
                  <span className="text-slate-500 text-xs">Locked milestone</span>
                )}

                {ach.unlockedAt && (
                  <span className="text-[10px] text-slate-500">
                    {new Date(ach.unlockedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
