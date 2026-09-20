import React from 'react';
import { Smartphone, Laptop } from 'lucide-react';
import { DeviceMetric } from '../../types/index.js';

interface DeviceBarChartProps {
  devices: DeviceMetric[];
}

export const DeviceBarChart: React.FC<DeviceBarChartProps> = ({ devices }) => {
  if (!devices || devices.length === 0) {
    return (
      <div className="text-xs text-zinc-500 py-6 text-center">
        No device metrics recorded for this period.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {devices.map((dev, i) => {
        const isPhone = dev.type === 'PHONE' || dev.name.toLowerCase().includes('phone') || dev.name.toLowerCase().includes('pixel');
        return (
          <div key={i} className="p-3 rounded-xl bg-[#15151f] border border-[#232332]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#1e1e2c] flex items-center justify-center text-zinc-300">
                  {isPhone ? <Smartphone className="w-4 h-4 text-amber-400" /> : <Laptop className="w-4 h-4 text-indigo-400" />}
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">{dev.name}</span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{dev.os} • {dev.type}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-white block font-mono">{dev.formatted}</span>
                <span className="text-[10px] text-zinc-400">{dev.percentage}% of daily total</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#20202e] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPhone ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, dev.percentage))}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
