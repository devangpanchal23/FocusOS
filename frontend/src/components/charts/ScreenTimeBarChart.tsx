import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendDay } from '../../types/index.js';

interface ScreenTimeBarChartProps {
  data: TrendDay[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dayData = payload[0].payload;
    return (
      <div className="bg-[#14141d] border border-[#28283c] p-3 rounded-xl shadow-xl text-xs space-y-1.5">
        <p className="font-semibold text-white border-b border-[#242436] pb-1">
          {label} ({dayData.date})
        </p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Total Screen Time:</span>
          <span className="font-bold text-amber-400">{dayData.screenTimeHours}h</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Shorts & Reels:</span>
          <span className="font-bold text-rose-400">{dayData.shortFormHours}h</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-400">Deep Work:</span>
          <span className="font-bold text-emerald-400">{dayData.productiveHours}h</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-[#242436]">
          <span className="text-zinc-400">Attention Score:</span>
          <span className="font-bold text-indigo-400">{dayData.attentionScore}/100</span>
        </div>
      </div>
    );
  }
  return null;
};

export const ScreenTimeBarChart: React.FC<ScreenTimeBarChartProps> = ({ data }) => {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2c" vertical={false} />
          <XAxis
            dataKey="day"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#272738' }}
          />
          <YAxis
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#272738' }}
            tickFormatter={(val) => `${val}h`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
          />
          <Bar
            dataKey="screenTimeHours"
            name="Screen Time"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            dataKey="shortFormHours"
            name="Shorts & Reels"
            fill="#f43f5e"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            dataKey="productiveHours"
            name="Deep Work"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
