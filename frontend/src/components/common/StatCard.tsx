import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  diffText?: string;
  isDiffPositive?: boolean; // In productivity, higher focus is positive, but higher screen time or reels is negative
  onClick?: () => void;
  badgeText?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-amber-400',
  diffText,
  isDiffPositive,
  onClick,
  badgeText,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl bg-[#121218] border border-[#20202c] card-hover relative overflow-hidden ${
        onClick ? 'cursor-pointer hover:border-amber-500/40' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {badgeText && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
              {badgeText}
            </span>
          )}
          <div className="w-8 h-8 rounded-lg bg-[#1a1a24] border border-[#272736] flex items-center justify-center">
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-2xl font-extrabold text-white font-['Outfit'] tracking-tight">
          {value}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1a1a24]">
        {diffText ? (
          <div
            className={`flex items-center gap-1 font-medium ${
              isDiffPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isDiffPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>{diffText}</span>
          </div>
        ) : (
          <span className="text-zinc-400">{subtitle || 'Active daily tracking'}</span>
        )}

        {onClick && (
          <span className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1">
            Explain <HelpCircle className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );
};
