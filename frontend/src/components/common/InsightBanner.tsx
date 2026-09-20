import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertTriangle, CheckCircle2, ArrowRight, ShieldCheck, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import { SmartInsight } from '../../types';

export const InsightBanner: React.FC = () => {
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadInsights() {
      try {
        const data = await api.getInsights();
        setInsights(data);
      } catch (err) {
        console.error('Failed to load insights:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInsights();
  }, []);

  if (loading || insights.length === 0) return null;

  const current = insights[currentIndex];

  const handleAction = () => {
    if (current.category === 'FOCUS') {
      navigate('/focus');
    } else if (current.category === 'SCROLLING' || current.category === 'HABIT') {
      navigate('/blocking');
    } else {
      navigate('/automation');
    }
  };

  const getBorderColor = (type: string) => {
    if (type === 'POSITIVE') return 'border-emerald-500/30 bg-emerald-950/20';
    if (type === 'WARNING') return 'border-amber-500/30 bg-amber-950/20';
    return 'border-indigo-500/30 bg-indigo-950/20';
  };

  const getBadge = (type: string) => {
    if (type === 'POSITIVE') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Positive Signal
        </span>
      );
    }
    if (type === 'WARNING') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Attention Required
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 flex items-center gap-1">
        <Sparkles className="w-3 h-3" /> Habit Pattern
      </span>
    );
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all ${getBorderColor(
        current.type
      )}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Info */}
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 shrink-0 text-indigo-400">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {getBadge(current.type)}
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {current.category} INTELLIGENCE
              </span>
              {current.impactScore !== undefined && (
                <span
                  className={`text-xs font-bold px-2 py-0.2 rounded ${
                    current.impactScore > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {current.impactScore > 0 ? `+${current.impactScore}` : current.impactScore} Attention Impact
                </span>
              )}
            </div>
            <h4 className="text-base font-bold text-white tracking-tight">{current.title}</h4>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              {current.description}
            </p>
            <div className="mt-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-lg inline-block">
              <strong className="text-slate-300">Data Evidence:</strong> {current.evidence}
            </div>
          </div>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          {insights.length > 1 && (
            <div className="flex items-center gap-1 mr-2">
              {insights.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? 'w-5 bg-indigo-400' : 'w-1.5 bg-slate-700 hover:bg-slate-600'
                  }`}
                  aria-label={`View insight ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {current.actionRecommendation && (
            <button
              onClick={handleAction}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-500/20 active:scale-95"
            >
              <span>Take Action</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {insights.length > 1 && (
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % insights.length)}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition"
              title="Next Insight"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
