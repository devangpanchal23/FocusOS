import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Flame } from 'lucide-react';

interface HourlyDataPoint {
  hour: string;
  reelsMinutes: number;
  workMinutes: number;
  totalMinutes: number;
}

export const HourlyActivityChart: React.FC = () => {
  // 24-hour timeline reconstruction based on user's active & scrolling behavior
  const hourlyData: HourlyDataPoint[] = [
    { hour: '12 AM', reelsMinutes: 12, workMinutes: 0, totalMinutes: 12 },
    { hour: '2 AM', reelsMinutes: 0, workMinutes: 0, totalMinutes: 0 },
    { hour: '4 AM', reelsMinutes: 0, workMinutes: 0, totalMinutes: 0 },
    { hour: '6 AM', reelsMinutes: 0, workMinutes: 0, totalMinutes: 0 },
    { hour: '8 AM', reelsMinutes: 10, workMinutes: 15, totalMinutes: 25 },
    { hour: '10 AM', reelsMinutes: 18, workMinutes: 40, totalMinutes: 58 },
    { hour: '12 PM', reelsMinutes: 35, workMinutes: 20, totalMinutes: 55 },
    { hour: '2 PM', reelsMinutes: 15, workMinutes: 45, totalMinutes: 60 },
    { hour: '4 PM', reelsMinutes: 25, workMinutes: 30, totalMinutes: 55 },
    { hour: '6 PM', reelsMinutes: 20, workMinutes: 35, totalMinutes: 55 },
    { hour: '8 PM', reelsMinutes: 55, workMinutes: 0, totalMinutes: 58 }, // Peak Hotspot #1
    { hour: '9 PM', reelsMinutes: 52, workMinutes: 0, totalMinutes: 55 }, // Peak Hotspot #2
    { hour: '10 PM', reelsMinutes: 25, workMinutes: 15, totalMinutes: 45 },
    { hour: '11 PM', reelsMinutes: 30, workMinutes: 0, totalMinutes: 35 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#14141d] border border-[#28283c] p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-semibold text-white border-b border-[#242436] pb-1">
            Time Block: {label}
          </p>
          <div className="flex items-center justify-between gap-4 text-rose-400">
            <span>Reels & Shorts:</span>
            <span className="font-bold font-mono">{data.reelsMinutes} mins</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400">
            <span>Focused Work:</span>
            <span className="font-bold font-mono">{data.workMinutes} mins</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-zinc-400 pt-1 border-t border-[#242436]">
            <span>Total Active:</span>
            <span className="font-bold font-mono">{data.totalMinutes} mins</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-3">
      {/* Hotspot banner */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-rose-950/40 via-amber-950/20 to-zinc-900 border border-rose-500/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              Highest Scrolling Hotspot Detected: 8:00 PM – 10:00 PM
            </span>
            <span className="text-[11px] text-zinc-400">
              1h 47m continuous Instagram Reels scrolling right before bedtime
            </span>
          </div>
        </div>
        <span className="text-xs font-bold text-rose-400 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
          🔥 Peak Vulnerability
        </span>
      </div>

      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReels" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorWork" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2c" vertical={false} />
            <XAxis
              dataKey="hour"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#272738' }}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#272738' }}
              tickFormatter={(v) => `${v}m`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="reelsMinutes"
              stroke="#f43f5e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorReels)"
              name="Reels / Shorts"
            />
            <Area
              type="monotone"
              dataKey="workMinutes"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorWork)"
              name="Deep Work"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
