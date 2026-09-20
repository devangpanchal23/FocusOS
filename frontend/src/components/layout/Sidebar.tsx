import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  Shield,
  Calendar,
  Cpu,
  Trophy,
  FileText,
  UploadCloud,
  CheckCircle2,
  BarChart3,
  Smartphone,
  Settings,
  LogOut,
  Flame,
  ShieldCheck,
  Bot,
  TrendingUp,
  Target,
  Users,
  Code2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const v3Nav = [
    { label: 'AI Assistant & Coach', path: '/ai-assistant', icon: Bot, isNew: true },
    { label: 'Predictive & Risks', path: '/predictions', icon: TrendingUp },
    { label: 'Planner & Goals', path: '/planner', icon: Target },
    { label: 'Circles & Social', path: '/community', icon: Users },
    { label: 'Privacy Center', path: '/privacy', icon: Lock },
    { label: 'Developer API', path: '/developer', icon: Code2 },
  ];

  const coreNav = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Focus Studio', path: '/focus', icon: Zap },
    { label: 'App Blocker', path: '/blocking', icon: Shield },
    { label: 'Routines', path: '/routines', icon: Calendar },
    { label: 'Automations', path: '/automation', icon: Cpu },
    { label: 'Achievements', path: '/achievements', icon: Trophy },
    { label: 'Reports & Export', path: '/reports', icon: FileText },
  ];

  const telemetryNav = [
    { label: 'Upload Center', path: '/uploads', icon: UploadCloud },
    { label: 'Review & Verify', path: '/review', icon: CheckCircle2 },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Devices', path: '/devices', icon: Smartphone },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen bg-[#0d0d12] border-r border-[#1f1f2a] flex flex-col fixed left-0 top-0 z-30">
      {/* Brand Logo */}
      <div className="p-5 border-b border-[#1f1f2a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Flame className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5 font-['Outfit']">
              FocusOS
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-indigo-300 font-semibold border border-indigo-500/30">
                V3 ECOSYSTEM
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Attention Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* V3 Intelligent Ecosystem */}
        <div className="px-3 pb-1.5 text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center justify-between">
          <span>AI & Intelligence</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
            V3
          </span>
        </div>
        {v3Nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#15151e]'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.isNew && (
                <span className="text-[9px] px-1 rounded bg-indigo-500/30 text-indigo-200 font-bold">
                  AI
                </span>
              )}
            </NavLink>
          );
        })}

        {/* Core Productivity & Habits */}
        <div className="pt-4 px-3 pb-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Productivity & Habits
        </div>
        {coreNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#15151e]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* Telemetry & Review */}
        <div className="pt-4 px-3 pb-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Telemetry & Ingestion
        </div>
        {telemetryNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#15151e]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* Bedtime Ingestion Quick Action */}
        <div className="pt-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#161622] to-[#12121a] border border-[#272738]">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bedtime Telemetry</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-2.5">
              Sync daily phone & laptop screen-time shots before sleeping.
            </p>
            <button
              onClick={() => navigate('/uploads')}
              className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload Today's Shots
            </button>
          </div>
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-[#1f1f2a] bg-[#0a0a0f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'D'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-200 truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-zinc-400 truncate">{user?.email || 'devang@focus.io'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-400 text-zinc-400 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
