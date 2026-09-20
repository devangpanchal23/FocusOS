import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CategoryMetric } from '../../types/index.js';

interface CategoryDonutChartProps {
  categories: CategoryMetric[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#14141d] border border-[#28283c] p-2.5 rounded-lg text-xs shadow-xl">
        <span className="font-semibold text-white block">{data.name}</span>
        <span className="text-zinc-400">
          {data.formatted} ({data.percentage}%)
        </span>
      </div>
    );
  }
  return null;
};

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ categories }) => {
  if (!categories || categories.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-zinc-500">
        No category records available.
      </div>
    );
  }

  return (
    <div className="w-full h-64 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={categories}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={4}
            dataKey="minutes"
          >
            {categories.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} stroke="#121218" strokeWidth={2} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Legend list below */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2 max-w-sm">
        {categories.slice(0, 5).map((cat, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: cat.color }}
            ></span>
            <span className="truncate">{cat.name} ({cat.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};
