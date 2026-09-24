import React from 'react';
import { Sparkles, Clock3, Database } from 'lucide-react';
import { PatternCard } from '../../services/v5.service';

export const PatternCards: React.FC<{ cards: PatternCard[] }> = ({ cards }) => {
  if (!cards || cards.length === 0) {
    return <p className="text-xs text-zinc-500">No pattern cards available yet — needs more tracked days.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {cards.map((card, idx) => (
        <div key={idx} className="p-4 rounded-xl bg-[#161622] border border-[#222232] space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <h4 className="text-xs font-bold text-white">{card.title}</h4>
          </div>
          {card.timeRange && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <Clock3 className="w-3 h-3" />
              <span className="font-mono">{card.timeRange}</span>
            </div>
          )}
          {card.metric && <p className="text-sm font-semibold text-amber-300">{card.metric}</p>}
          {card.sources && card.sources.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {card.sources.map((s, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {card.evidence && (
            <p className="text-[11px] text-zinc-500 leading-relaxed flex items-start gap-1.5 pt-1 border-t border-[#1c1c28]">
              <Database className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{card.evidence}</span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
