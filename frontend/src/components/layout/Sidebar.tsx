import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  CheckCircle2,
  BarChart3,
  Smartphone,
  LogOut,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Upload Center', path: '/uploads', icon: UploadCloud },
    { label: 'Review & Verify', path: '/review', icon: CheckCircle2 },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Devices', path: '/devices', icon: Smartphone },
  ];

  return (
    <aside className="w-64 h-screen bg-[#0d0d12] border-r border-[#1f1f2a] flex flex-col fixed left-0 top-0 z-30">
      {/* Brand Logo */}
      <div className="p-6 border-b border-[#1f1f2a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-glow-amber">
            <Flame className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5 font-['Outfit']">
              FocusOS
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                V1
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Attention Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Daily Routine
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
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

        <div className="pt-6 px-3 pb-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          Bedtime Workflow
        </div>
        <div className="p-3 mx-1 rounded-xl bg-gradient-to-br from-[#161622] to-[#12121a] border border-[#272738]">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Nightly Upload</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
            Drop phone & laptop screen-time shots before sleeping.
          </p>
          <button
            onClick={() => navigate('/uploads')}
            className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload Today's
          </button>
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
