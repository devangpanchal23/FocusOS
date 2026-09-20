import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, AlertCircle, Zap, Shield, Sparkles, X } from 'lucide-react';
import { api } from '../../services/api';
import { FocusProfile, FocusSession } from '../../types';

interface FocusTimerProps {
  profiles: FocusProfile[];
  onSessionFinished?: () => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ profiles, onSessionFinished }) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(profiles[0]?.id || '');
  const [taskName, setTaskName] = useState<string>('Deep Work Sprint');
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isBreak, setIsBreak] = useState<boolean>(false);
  const [distractions, setDistractions] = useState<number>(0);
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [completionResult, setCompletionResult] = useState<{ xpEarned: number; distractionBonus: number } | null>(null);

  const timerRef = useRef<any>(null);

  // Sync with selected profile
  useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(profiles[0].id);
      setDurationMinutes(profiles[0].durationMinutes);
      setSecondsRemaining(profiles[0].durationMinutes * 60);
    }
  }, [profiles]);

  const handleProfileChange = (profileId: string) => {
    if (isActive) return; // Prevent change mid-session
    setSelectedProfileId(profileId);
    const prof = profiles.find((p) => p.id === profileId);
    if (prof) {
      setDurationMinutes(prof.durationMinutes);
      setSecondsRemaining(prof.durationMinutes * 60);
      setTaskName(prof.name);
    }
  };

  // Timer Tick
  useEffect(() => {
    if (isActive && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isActive) {
      handleComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, secondsRemaining]);

  const handleStart = async () => {
    if (!activeSession) {
      try {
        const session = await api.startFocusSession({
          profileId: selectedProfileId || undefined,
          taskName: taskName || 'Deep Work Session',
          durationMinutes,
        });
        setActiveSession(session);
      } catch (err) {
        console.error('Failed to start session on backend:', err);
      }
    }
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setSecondsRemaining(durationMinutes * 60);
    setDistractions(0);
    if (activeSession) {
      api.abortFocusSession(activeSession.id).catch(console.error);
      setActiveSession(null);
    }
  };

  const handleRecordDistraction = async () => {
    setDistractions((prev) => prev + 1);
    if (activeSession) {
      try {
        await api.recordDistraction(activeSession.id);
      } catch (err) {
        console.error('Failed to record distraction:', err);
      }
    }
  };

  const handleComplete = async () => {
    setIsActive(false);
    const completedMins = Math.max(1, Math.round((durationMinutes * 60 - secondsRemaining) / 60));

    if (activeSession) {
      try {
        const res = await api.completeFocusSession(activeSession.id, {
          completedMinutes: completedMins,
          notes: taskName,
        });
        setCompletionResult({
          xpEarned: res.xpEarned,
          distractionBonus: res.distractionBonus,
        });
      } catch (err) {
        console.error('Failed to complete session:', err);
      }
    }

    onSessionFinished?.();
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Circular progress math
  const totalSeconds = durationMinutes * 60;
  const progressPercent = ((totalSeconds - secondsRemaining) / (totalSeconds || 1)) * 100;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="relative bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Celebration Modal */}
      {completionResult && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md rounded-3xl flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/20">
              <Sparkles className="w-8 h-8 text-white animate-bounce" />
            </div>
            <h3 className="text-2xl font-black text-white">Session Completed!</h3>
            <p className="text-sm text-slate-300 mt-2">
              Outstanding discipline! You maintained flow and earned:
            </p>
            <div className="my-4 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 font-bold text-xl">
              +{completionResult.xpEarned} XP
              {completionResult.distractionBonus > 0 && (
                <div className="text-xs font-normal text-emerald-400 mt-1">
                  Includes +{completionResult.distractionBonus} XP Zero-Distraction Bonus!
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setCompletionResult(null);
                handleReset();
              }}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-500/25"
            >
              Continue & Claim Rewards
            </button>
          </div>
        </div>
      )}

      {/* Header Profile Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Focus Studio
          </h3>
          <p className="text-xs text-slate-400">High-integrity Pomodoro & deep-work flow state</p>
        </div>

        <div className="flex items-center gap-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProfileChange(p.id)}
              disabled={isActive}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedProfileId === p.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {p.name} ({p.durationMinutes}m)
            </button>
          ))}
        </div>
      </div>

      {/* Task Name Input */}
      <div className="mt-6 max-w-md mx-auto">
        <input
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          disabled={isActive}
          placeholder="What are you focusing on?"
          className="w-full text-center bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* Circular Timer Visual */}
      <div className="relative my-8 flex items-center justify-center">
        <svg className="w-72 h-72 transform -rotate-90">
          {/* Background Track */}
          <circle
            cx="144"
            cy="144"
            r={radius}
            className="stroke-slate-800/80"
            strokeWidth="12"
            fill="transparent"
          />
          {/* Active Gradient Ring */}
          <circle
            cx="144"
            cy="144"
            r={radius}
            stroke="url(#timerGradient)"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-linear"
          />
          <defs>
            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Timer Text */}
        <div className="absolute text-center">
          <span className="text-5xl font-black text-white tracking-tight font-mono">
            {formatTime(secondsRemaining)}
          </span>
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-1">
            {isActive ? (isBreak ? 'Rest Break' : 'Deep Focus') : 'Ready to Start'}
          </div>
          {distractions > 0 && (
            <div className="mt-2 text-[11px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {distractions} distraction{distractions > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-4">
        {!isActive ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 transition active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" /> Start Session
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm shadow-md transition active:scale-95"
          >
            <Pause className="w-4 h-4 fill-current" /> Pause
          </button>
        )}

        <button
          onClick={handleReset}
          className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {isActive && (
          <button
            onClick={handleComplete}
            className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition"
            title="Finish early and save"
          >
            <CheckCircle className="w-4 h-4" /> Finish Early
          </button>
        )}
      </div>

      {/* Distraction Interruption Tracker (Visible while running) */}
      {isActive && (
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-300">Got interrupted or checked phone?</div>
            <div className="text-[11px] text-slate-500">
              Tracking distractions preserves transparency in your attention integrity report.
            </div>
          </div>
          <button
            onClick={handleRecordDistraction}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
          >
            <span>+1 Distraction</span>
          </button>
        </div>
      )}
    </div>
  );
};
