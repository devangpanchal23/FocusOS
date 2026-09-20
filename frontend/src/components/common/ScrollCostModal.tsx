import React from 'react';
import { X, Flame, Clock, BookOpen, Code, Footprints, FileText } from 'lucide-react';

interface ScrollCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  scrollCost: {
    minutes: number;
    formatted: string;
    hours: number;
    equivalents: {
      label: string;
      value: string;
      icon: string;
    }[];
  };
}

export const ScrollCostModal: React.FC<ScrollCostModalProps> = ({
  isOpen,
  onClose,
  scrollCost,
}) => {
  if (!isOpen) return null;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Code':
        return <Code className="w-5 h-5 text-emerald-400" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5 text-amber-400" />;
      case 'Footprints':
        return <Footprints className="w-5 h-5 text-cyan-400" />;
      default:
        return <FileText className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#121218] border border-[#272738] rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1f1f2c] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-['Outfit']">
              Short-Form Scroll Cost Translation
            </h3>
            <p className="text-xs text-zinc-400">
              Opportunity cost of short-form algorithm consumption
            </p>
          </div>
        </div>

        {/* Big Cost Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/30 to-amber-950/20 border border-rose-500/20 mb-6">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black text-rose-400 font-['Outfit']">
              {scrollCost.formatted}
            </span>
            <span className="text-sm text-zinc-400">({scrollCost.minutes} minutes spent)</span>
          </div>
          <p className="text-xs text-zinc-300">
            Recovering even 30 minutes daily gives you{' '}
            <span className="text-amber-400 font-semibold">182.5 hours/year</span> of uninterrupted deep focus.
          </p>
        </div>

        {/* Equivalents Grid */}
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Equivalent Productivity Output
        </h4>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {scrollCost.equivalents.map((item, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-[#161622] border border-[#232334] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-400">{item.label}</span>
                {getIcon(item.icon)}
              </div>
              <span className="text-base font-bold text-white font-['Outfit']">{item.value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition"
        >
          Close & Back to Dashboard
        </button>
      </div>
    </div>
  );
};
