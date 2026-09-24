import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  Bot,
  Cpu,
  BookOpen,
  Sliders,
  MessageSquare,
  Share2,
  Building2,
  LayoutDashboard,
  Zap,
  Shield,
  Calendar,
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
  TrendingUp,
  Target,
  Users,
  Code2,
  Lock,
  Compass,
  History,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const v4Nav = [
    { label: 'Personal OS Home', path: '/os', icon: Activity, isNew: true, badge: 'OS 4' },
    { label: 'Agent Swarm Studio', path: '/agents', icon: Bot, isNew: true, badge: 'SWARM' },
    { label: 'Visual AI Workflows', path: '/workflows', icon: Cpu, isNew: true, badge: 'BUILDER' },
    { label: 'Knowledge & Context', path: '/knowledge', icon: BookOpen },
    { label: 'Scenario Simulator', path: '/simulations', icon: Sliders },
    { label: 'AI Reflections & Coach', path: '/reflections', icon: MessageSquare },
  ];

  const platformNav = [
    { label: 'Ecosystem & Apps', path: '/ecosystem', icon: Share2, isNew: true },
    { label: 'Enterprise & SaaS', path: '/platform', icon: Building2, isNew: true },
    { label: 'Devices', path: '/devices', icon: Smartphone },
  ];

  const v5Nav = [
    { label: 'Browser Intelligence', path: '/browser', icon: Compass, badge: 'V5' },
    { label: 'Unified Timeline', path: '/timeline', icon: History, badge: 'V5' },
  ];

  const coreNav = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Focus Studio', path: '/focus', icon: Zap },
    { label: 'App Blocker', path: '/blocking', icon: Shield },
    { label: 'Routines', path: '/routines', icon: Calendar },
    { label: 'Automations', path: '/automation', icon: Cpu },
    { label: 'Planner & Goals', path: '/planner', icon: Target },
    { label: 'Predictive & Risks', path: '/predictions', icon: TrendingUp },
    { label: 'Achievements', path: '/achievements', icon: Trophy },
    { label: 'Reports & Export', path: '/reports', icon: FileText },
  ];

  const telemetryNav = [
    { label: 'Upload Center', path: '/uploads', icon: UploadCloud },
    { label: 'Review & Verify', path: '/review', icon: CheckCircle2 },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Circles & Social', path: '/community', icon: Users },
    { label: 'Privacy Center', path: '/privacy', icon: Lock },
    { label: 'Developer API', path: '/developer', icon: Code2 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen bg-[#0d0d12] border-r border-[#1f1f2a] flex flex-col fixed left-0 top-0 z-30">
      {/* Brand Logo */}
      <div className="p-5 border-b border-[#1f1f2a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Flame className="w-6 h-6 text-white stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5 font-['Outfit']">
              FocusOS
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500/30 to-indigo-500/30 text-amber-300 font-bold border border-amber-500/30">
                V4 OS
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Autonomous Productivity OS</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* V4 AUTONOMOUS OPERATING SYSTEM */}
        <div className="px-3 pb-1.5 text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-between">
          <span>Operating System</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
            V4
          </span>
        </div>
        {v4Nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-indigo-600/20 text-amber-300 border border-amber-500/30 shadow-md font-semibold'
                    : 'text-zinc-300 hover:text-white hover:bg-[#15151e]'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-amber-400/90" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[8px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 font-bold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* V5 UNIFIED INGESTION & INTELLIGENCE */}
        <div className="pt-4 px-3 pb-1.5 text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
          <span>Unified Intelligence</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
            V5
          </span>
        </div>
        {v5Nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm font-semibold'
                    : 'text-zinc-300 hover:text-white hover:bg-[#15151e]'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-emerald-400/90" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[8px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

        {/* ECOSYSTEM & PLATFORM */}
        <div className="pt-4 px-3 pb-1.5 text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center justify-between">
          <span>Platform & Ecosystem</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
            HUB
          </span>
        </div>
        {platformNav.map((item) => {
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

        {/* CORE PRODUCTIVITY & HABITS */}
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
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#15151e]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* TELEMETRY & SETTINGS */}
        <div className="pt-4 px-3 pb-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Telemetry & Data
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
                    ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
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
              <span>Autonomous Telemetry</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-2.5">
              Sync screen time & verified telemetry across connected devices.
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'D'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-200 truncate">{user?.name || 'Devang'}</p>
              <p className="text-[11px] text-zinc-400 truncate">{user?.email || 'devang@focusintelligence.io'}</p>
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
