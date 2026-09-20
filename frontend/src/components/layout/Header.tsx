import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Calendar,
  RefreshCw,
  CheckCircle,
  Flame,
  Trophy,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { NotificationDropdown } from '../common/NotificationDropdown';
import { api } from '../../services/api';
import { v4Api } from '../../services/v4.service';
import { UniversalSearchModal } from '../v4/UniversalSearchModal';
import { ApprovalDrawer } from '../v4/ApprovalDrawer';

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
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState(false);

  useEffect(() => {
    async function loadHeaderTelemetry() {
      try {
        const [gameData, approvals] = await Promise.all([
          api.getGamification(),
          v4Api.getPendingApprovals(),
        ]);
        if (gameData) {
          setStreak(gameData.dailyStreak || 7);
          setLevel(gameData.level || 4);
        }
        if (approvals) {
          setPendingCount(approvals.length);
        }
      } catch (err) {
        // Fallback gracefully
      }
    }
    loadHeaderTelemetry();

    // Global Cmd+K / Ctrl+K listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    <>
      <header className="h-20 border-b border-[#1f1f2a] bg-[#09090b]/80 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        {/* Left: Greeting & Current View */}
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>{getGreeting()}, {user?.name?.split(' ')[0] || 'Devang'}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
            <span className="text-amber-400 font-medium">{formattedDate}</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-['Outfit']">
            FocusOS Intelligence
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              V4 Autonomous Core
            </span>
          </h2>
        </div>

        {/* Center/Right: Universal Search Trigger & Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Universal Search Cmd+K Quick Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#13131c] border border-[#272738] text-zinc-400 hover:text-zinc-200 hover:border-[#38384f] transition text-xs shadow-sm"
            title="Open Universal Productivity Search (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Universal Search...</span>
            <kbd className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1e1e2d] text-zinc-400 border border-[#2e2e42]">
              ⌘K
            </kbd>
          </button>

          {/* Human-in-the-Loop Action Approvals Counter */}
          <button
            onClick={() => setIsApprovalDrawerOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              pendingCount > 0
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                : 'bg-[#13131c] text-zinc-400 border-[#272738] hover:text-zinc-200'
            }`}
            title="Review Autonomous Agent Proposals"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${pendingCount > 0 ? 'text-amber-400' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline">Approvals</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Streak & Level mini pills */}
          <button
            onClick={() => navigate('/achievements')}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
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
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </header>

      {/* Universal Search Modal */}
      <UniversalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Human-In-The-Loop Approval Drawer */}
      <ApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
        onActionComplete={async () => {
          const apprs = await v4Api.getPendingApprovals();
          setPendingCount(apprs.length);
        }}
      />
    </>
  );
};
