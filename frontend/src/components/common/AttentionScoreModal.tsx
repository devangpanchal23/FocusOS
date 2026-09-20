import React from 'react';
import { X, Sparkles, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';

interface AttentionScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  factors: {
    label: string;
    points: number;
    description: string;
    type: 'positive' | 'negative' | 'neutral';
  }[];
}

export const AttentionScoreModal: React.FC<AttentionScoreModalProps> = ({
  isOpen,
  onClose,
  score,
  factors,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#121218] border border-[#272738] rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1f1f2c] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">
              Attention Score Formula & Breakdown
            </h3>
            <p className="text-xs text-zinc-400">
              Transparent, non-blackbox scoring based on verifiable day metrics
            </p>
          </div>
        </div>

        {/* Current Score Pill */}
        <div className="p-4 rounded-xl bg-[#171720] border border-[#222230] flex items-center justify-between mb-6">
          <div>
            <span className="text-xs text-zinc-400 block mb-0.5">Calculated Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-400 font-['Outfit']">{score}</span>
              <span className="text-sm font-semibold text-zinc-400">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {score >= 80 ? 'Exceptional Flow' : score >= 65 ? 'Controlled Attention' : 'Distracted Day'}
            </span>
            <span className="block text-[11px] text-zinc-400 mt-1">Base neutral score: 50 pts</span>
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="space-y-2.5 mb-6 max-h-60 overflow-y-auto pr-1">
          {factors.map((f, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-[#161620] border border-[#20202e] flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    f.type === 'positive'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {f.type === 'positive' ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-zinc-200 block truncate">{f.label}</span>
                  <span className="text-[11px] text-zinc-400 block truncate">{f.description}</span>
                </div>
              </div>
              <span
                className={`font-bold font-mono text-sm shrink-0 ml-3 ${
                  f.points > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {f.points > 0 ? `+${f.points}` : f.points}
              </span>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-3 border-t border-[#1f1f2c]">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Every factor is directly computed from your confirmed Digital Wellbeing & Battery usage records.
          </span>
        </div>
      </div>
    </div>
  );
};
