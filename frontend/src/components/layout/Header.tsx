import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Calendar, RefreshCw, CheckCircle, Flame, Trophy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { NotificationDropdown } from '../common/NotificationDropdown';
import { api } from '../../services/api';

interface HeaderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ selectedDate, onDateChange, onRefresh }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [streak, setStreak] = useState<number>(7);
  const [level, setLevel] = useState<number>(4);

  useEffect(() => {
    async function loadGamificationMini() {
      try {
        const data = await api.getGamification();
        if (data) {
          setStreak(data.dailyStreak || 7);
          setLevel(data.level || 4);
        }
      } catch (err) {
        // Fallback gracefully
      }
    }
    loadGamificationMini();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const dateObj = new Date(selectedDate);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="h-20 border-b border-[#1f1f2a] bg-[#09090b]/80 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Greeting & Current View */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>{getGreeting()}, {user?.name?.split(' ')[0] || 'Devang'}</span>
          <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
          <span className="text-amber-400 font-medium">{formattedDate}</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Outfit']">
          Executive Focus Dashboard
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" />
            V2 Engine Online
          </span>
        </h2>
      </div>

      {/* Right: Gamification Badges, Date Picker, Notifications & Upload CTA */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Streak & Level mini pills */}
        <button
          onClick={() => navigate('/achievements')}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
          title="View Gamification & Achievements"
        >
          <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
            <Flame className="w-4 h-4 fill-amber-400/20 text-amber-400" />
            <span>{streak}d</span>
          </div>
          <span className="w-1 h-3 bg-slate-800" />
          <div className="flex items-center gap-1 text-xs font-bold text-purple-400">
            <Trophy className="w-3.5 h-3.5 text-purple-400" />
            <span>Lvl {level}</span>
          </div>
        </button>

        {/* Date Filter */}
        <div className="hidden sm:flex items-center bg-[#14141c] border border-[#272738] rounded-xl p-1 text-xs">
          <button
            onClick={() => onDateChange(todayStr)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              selectedDate === todayStr
                ? 'bg-amber-500 text-zinc-950 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Today
          </button>
          <div className="flex items-center px-2 text-zinc-400 gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-zinc-300 text-xs focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh Data"
            className="p-2 rounded-xl bg-[#14141c] border border-[#272738] text-zinc-400 hover:text-white hover:border-[#38384f] transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Notification Center Bell */}
        <NotificationDropdown />

        {/* Upload CTA */}
        <button
          onClick={() => navigate('/uploads')}
          className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-zinc-950 font-bold text-xs transition shadow-glow-amber active:scale-95"
        >
          <UploadCloud className="w-4 h-4" />
          <span className="hidden sm:inline">Upload Screenshots</span>
          <span className="sm:hidden">Upload</span>
        </button>
      </div>
    </header>
  );
};
