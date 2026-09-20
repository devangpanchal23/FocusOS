import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  Compass,
  Tablet,
  Share2,
  Calendar,
  Music,
  FileText,
  GitPullRequest,
  MessageSquare,
  CheckSquare,
  CheckCircle2,
  Download,
  Trash2,
  Shield,
  Star,
  RefreshCw,
  Search,
} from 'lucide-react';
import { v4Api } from '../../services/v4.service';

export const EcosystemPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DEVICES' | 'INTEGRATIONS' | 'MARKETPLACE'>('DEVICES');
  const [devices, setDevices] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [marketplaceApps, setMarketplaceApps] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      const [devData, intData, mktData] = await Promise.all([
        v4Api.getDevices(),
        v4Api.getIntegrations(),
        v4Api.getMarketplaceCatalog(selectedCategory, searchQuery),
      ]);
      setDevices(devData || []);
      setIntegrations(intData || []);
      setMarketplaceApps(mktData || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeviceSync = async (id: string) => {
    setSyncingDeviceId(id);
    try {
      const res = await v4Api.triggerDeviceSync(id);
      alert(res.message);
      await loadData();
    } catch (e: any) {
      alert(`Sync error: ${e.message}`);
    } finally {
      setSyncingDeviceId(null);
    }
  };

  const handleToggleIntegration = async (provider: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus !== 'CONNECTED';
      await v4Api.toggleIntegration(provider, nextStatus);
      await loadData();
    } catch (e: any) {
      alert(`Toggle failed: ${e.message}`);
    }
  };

  const handleInstallApp = async (slug: string) => {
    try {
      await v4Api.installApp(slug);
      alert('Plugin installed successfully with requested permission scopes!');
      await loadData();
    } catch (e: any) {
      alert(`Install error: ${e.message}`);
    }
  };

  const getIntegrationIcon = (provider: string) => {
    switch (provider) {
      case 'GOOGLE_CALENDAR':
        return <Calendar className="w-5 h-5 text-blue-400" />;
      case 'SPOTIFY':
        return <Music className="w-5 h-5 text-emerald-400" />;
      case 'NOTION':
        return <FileText className="w-5 h-5 text-zinc-300" />;
      case 'GITHUB':
        return <GitPullRequest className="w-5 h-5 text-purple-400" />;
      case 'SLACK':
        return <MessageSquare className="w-5 h-5 text-amber-400" />;
      case 'TODOIST':
      default:
        return <CheckSquare className="w-5 h-5 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              PHASE 17–21 ECOSYSTEM
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400">Cross-Device & Marketplace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Ecosystem, Integrations & App Marketplace
          </h1>
          <p className="text-sm text-zinc-400">
            Unify telemetry across connected devices, sync calendar & notes, and extend FocusOS with curated productivity tools.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#14141f] border border-[#242436]">
          {(['DEVICES', 'INTEGRATIONS', 'MARKETPLACE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === tab
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 1. DEVICES TAB */}
      {activeTab === 'DEVICES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((d) => (
              <div key={d.id} className="p-5 rounded-2xl bg-[#101018] border border-[#212132] space-y-4 shadow-md flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                      {d.os}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {d.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{d.name}</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Timezone: {d.timezone || 'Asia/Kolkata'}
                  </p>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Last Synced: {d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString() : 'Just now'}
                  </p>
                </div>

                <button
                  disabled={syncingDeviceId === d.id}
                  onClick={() => handleDeviceSync(d.id)}
                  className="w-full py-2 px-3 rounded-xl bg-[#171724] hover:bg-[#202030] text-zinc-200 border border-[#2b2b3d] text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingDeviceId === d.id ? 'animate-spin' : ''}`} />
                  {syncingDeviceId === d.id ? 'Broadcasting Sync...' : 'Trigger Remote Sync'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. INTEGRATIONS TAB */}
      {activeTab === 'INTEGRATIONS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((app) => (
              <div key={app.id} className="p-5 rounded-2xl bg-[#101018] border border-[#212132] space-y-4 shadow-md flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#171724] flex items-center justify-center border border-[#2b2b3e]">
                      {getIntegrationIcon(app.provider)}
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      app.status === 'CONNECTED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {app.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{app.name}</h3>
                  <p className="text-[11px] text-zinc-400">Category: {app.category}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Scopes: {app.scopes}
                  </p>
                </div>

                <button
                  onClick={() => handleToggleIntegration(app.provider, app.status)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition ${
                    app.status === 'CONNECTED'
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                  }`}
                >
                  {app.status === 'CONNECTED' ? 'Disconnect Integration' : 'Connect & Authorize'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. MARKETPLACE TAB */}
      {activeTab === 'MARKETPLACE' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#12121b] border border-[#242436]">
            <div className="flex items-center gap-2 overflow-x-auto text-xs">
              {['ALL', 'FOCUS_PACK', 'AGENT', 'THEME', 'INTEGRATION'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#191926]'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            <span className="text-xs text-zinc-500 font-mono">
              Third-Party Sandbox Sandboxing Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketplaceApps.map((item) => (
              <div key={item.id} className="p-5 rounded-2xl bg-[#101018] border border-[#212132] space-y-3 flex flex-col justify-between shadow-md">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                      {item.category.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{item.rating}</span>
                      <span className="text-zinc-500 text-[10px] font-mono">({item.installCount} installs)</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">{item.name}</h3>
                    <p className="text-[10px] text-zinc-500">By {item.author} • v{item.version}</p>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                </div>

                <div className="pt-3 border-t border-[#1b1b28] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Scopes: {item.permissions?.join(', ') || 'none'}</span>
                  </div>

                  <button
                    onClick={() => handleInstallApp(item.slug)}
                    className="py-1.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Install Plugin
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
