import React, { useState, useEffect } from 'react';
import {
  Globe,
  Clock,
  BarChart3,
  ShieldOff,
  Plus,
  Trash2,
  Compass,
  Shuffle,
  Monitor,
  X,
  Tag,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  v5Api,
  BrowserSummary,
  DomainAnalytics,
  BrowserExclusionRule,
  TabSwitchingStats,
  BrowserInstance,
} from '../../services/v5.service';

const BAR_COLORS = ['#f59e0b', '#ea580c', '#6366f1', '#10b981', '#f43f5e', '#06b6d4'];

export const BrowserIntelligencePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'DOMAINS' | 'TAB_SWITCHING' | 'INSTANCES' | 'EXCLUSIONS'>('SUMMARY');
  const [summary, setSummary] = useState<BrowserSummary | null>(null);
  const [domains, setDomains] = useState<DomainAnalytics[]>([]);
  const [exclusions, setExclusions] = useState<BrowserExclusionRule[]>([]);
  const [tabSwitching, setTabSwitching] = useState<TabSwitchingStats | null>(null);
  const [instances, setInstances] = useState<BrowserInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newDomainPattern, setNewDomainPattern] = useState('');
  const [newReason, setNewReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selectedDomain, setSelectedDomain] = useState<DomainAnalytics | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, domainsRes, exclusionsRes, tabSwitchRes, instancesRes] = await Promise.allSettled([
        v5Api.browser.getSummary(todayStr),
        v5Api.browser.getDomains(),
        v5Api.browser.getExclusions(),
        v5Api.browser.getTabSwitching(),
        v5Api.browser.getInstances(),
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
      if (domainsRes.status === 'fulfilled') setDomains(Array.isArray(domainsRes.value) ? domainsRes.value : []);
      if (exclusionsRes.status === 'fulfilled') setExclusions(Array.isArray(exclusionsRes.value) ? exclusionsRes.value : []);
      if (tabSwitchRes.status === 'fulfilled') setTabSwitching(tabSwitchRes.value);
      if (instancesRes.status === 'fulfilled') setInstances(Array.isArray(instancesRes.value) ? instancesRes.value : []);

      if (summaryRes.status === 'rejected' && domainsRes.status === 'rejected' && exclusionsRes.status === 'rejected') {
        setError('Unable to reach Browser Intelligence services yet.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load browser intelligence data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddExclusion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainPattern.trim()) return;
    setSubmitting(true);
    try {
      await v5Api.browser.upsertExclusion({
        domainPattern: newDomainPattern.trim(),
        reason: newReason.trim() || undefined,
      });
      setNewDomainPattern('');
      setNewReason('');
      await loadData();
    } catch (e: any) {
      alert(`Failed to add exclusion: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExclusion = async (id: string) => {
    if (!window.confirm('Remove this exclusion rule?')) return;
    try {
      await v5Api.browser.deleteExclusion(id);
      await loadData();
    } catch (e: any) {
      alert(`Failed to delete: ${e.message}`);
    }
  };

  const topDomains = [...domains]
    .sort((a, b) => (b?.totalMinutes || 0) - (a?.totalMinutes || 0))
    .slice(0, 8);

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-amber/20 text-amber-300 font-bold border border-amber-500/30">
              V5 BROWSER INTELLIGENCE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Browser Intelligence
          </h1>
          <p className="text-sm text-zinc-400">
            Domain-level analytics from the FocusOS browser extension, with exclusion rules for private browsing.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#14141f] border border-[#242436] flex-wrap">
          {(['SUMMARY', 'DOMAINS', 'TAB_SWITCHING', 'INSTANCES', 'EXCLUSIONS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === tab
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab
                .split('_')
                .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
                .join(' ')}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-zinc-500">Loading browser telemetry...</div>
      ) : (
        <>
          {/* SUMMARY TAB */}
          {activeTab === 'SUMMARY' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-[#121218] border border-[#20202c] flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wide">Total Browser Time Today</p>
                    <p className="text-xl font-bold text-white font-mono">
                      {summary?.totalMinutes != null ? `${summary.totalMinutes}m` : '—'}
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#121218] border border-[#20202c] flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                    <Compass className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wide">Top Domain</p>
                    <p className="text-xl font-bold text-white truncate max-w-[180px]">
                      {summary?.topDomain || '—'}
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#121218] border border-[#20202c] flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wide">Unique Domains</p>
                    <p className="text-xl font-bold text-white font-mono">
                      {summary?.domainCount != null ? summary.domainCount : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {(!summary || (summary.totalMinutes == null && summary.domainCount == null)) && (
                <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-2xl">
                  No browser telemetry recorded yet today. Install and enable the FocusOS extension to begin tracking.
                </div>
              )}
            </div>
          )}

          {/* DOMAINS TAB */}
          {activeTab === 'DOMAINS' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white font-['Outfit']">Top Domains by Time</h3>
                    <p className="text-xs text-zinc-400">Ranked by total minutes across the selected range</p>
                  </div>
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                </div>

                {topDomains.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topDomains} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#242436" horizontal={false} />
                      <XAxis type="number" stroke="#71717a" fontSize={11} />
                      <YAxis
                        type="category"
                        dataKey="domain"
                        stroke="#71717a"
                        fontSize={11}
                        width={140}
                      />
                      <Tooltip
                        contentStyle={{ background: '#18181f', border: '1px solid #272732', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#e4e4e7' }}
                      />
                      <Bar dataKey="totalMinutes" radius={[0, 6, 6, 0]}>
                        {topDomains.map((_, idx) => (
                          <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs text-zinc-500">
                    No domain analytics available yet.
                  </div>
                )}
              </div>

              <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
                <h3 className="text-base font-bold text-white font-['Outfit'] mb-4">All Domains</h3>
                <div className="space-y-2">
                  {domains.map((d, i) => (
                    <div
                      key={`${d.domain}-${i}`}
                      onClick={() => setSelectedDomain(d)}
                      className="p-3.5 rounded-xl bg-[#161622] border border-[#222232] flex items-center justify-between gap-3 cursor-pointer hover:border-amber-500/40 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Globe className="w-4 h-4 text-zinc-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">{d.domain}</span>
                            {d.category && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold">
                                {d.category}
                              </span>
                            )}
                            {d.isDistraction && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                                Distraction
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400">{d.sessionCount} sessions</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono text-white shrink-0">
                        {d.totalMinutes}m
                      </span>
                    </div>
                  ))}

                  {domains.length === 0 && (
                    <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-xl">
                      No domain records found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB_SWITCHING TAB */}
          {activeTab === 'TAB_SWITCHING' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-[#121218] border border-[#20202c] flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                    <Shuffle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wide">Total Tab Switches</p>
                    <p className="text-xl font-bold text-white font-mono">
                      {tabSwitching?.totalSwitches != null ? tabSwitching.totalSwitches : '—'}
                    </p>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-[#121218] border border-[#20202c] flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wide">Avg Seconds Before Switch</p>
                    <p className="text-xl font-bold text-white font-mono">
                      {tabSwitching?.avgSecondsBeforeSwitch != null ? `${Math.round(tabSwitching.avgSecondsBeforeSwitch)}s` : '—'}
                    </p>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-[#121218] border border-[#20202c] flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wide">Peak Switching Hour</p>
                    <p className="text-xl font-bold text-white font-mono">
                      {tabSwitching?.peakHour != null ? `${tabSwitching.peakHour}:00` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
                <h3 className="text-base font-bold text-white font-['Outfit'] mb-4">Switches Per Hour</h3>
                {tabSwitching?.switchesPerHour && tabSwitching.switchesPerHour.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={tabSwitching.switchesPerHour}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#242436" />
                      <XAxis dataKey="hour" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip
                        contentStyle={{ background: '#18181f', border: '1px solid #272732', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#e4e4e7' }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs text-zinc-500">
                    No tab-switching telemetry available yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* INSTANCES TAB */}
          {activeTab === 'INSTANCES' && (
            <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
              <div className="flex items-center gap-2 mb-4">
                <Monitor className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white font-['Outfit']">Browser / Device Instances</h3>
              </div>
              <div className="space-y-2">
                {instances.map((inst) => (
                  <div
                    key={inst.id}
                    className="p-3.5 rounded-xl bg-[#161622] border border-[#222232] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-white truncate">{inst.label || inst.id}</span>
                      <p className="text-[11px] text-zinc-400">
                        {inst.lastSyncAt ? `Last synced: ${new Date(inst.lastSyncAt).toLocaleString()}` : 'No sync activity yet'}
                      </p>
                    </div>
                    <span className="text-xs font-bold font-mono text-white shrink-0">
                      {inst.eventCount != null ? `${inst.eventCount} events` : '—'}
                    </span>
                  </div>
                ))}
                {instances.length === 0 && (
                  <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-xl">
                    No distinct browser instances detected yet. Install the extension on more than one browser to see a breakdown here.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EXCLUSIONS TAB */}
          {activeTab === 'EXCLUSIONS' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldOff className="w-4 h-4 text-rose-400" />
                  <h3 className="text-base font-bold text-white font-['Outfit']">Excluded Domains</h3>
                </div>

                <div className="space-y-2">
                  {exclusions.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3.5 rounded-xl bg-[#161622] border border-[#222232] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-white">{rule.domainPattern}</span>
                        {rule.reason && (
                          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{rule.reason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteExclusion(rule.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                        title="Remove exclusion"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {exclusions.length === 0 && (
                    <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-xl">
                      No exclusion rules configured. Excluded domains are never recorded by the extension.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c] h-fit">
                <h3 className="text-sm font-bold text-white font-['Outfit'] mb-3">Add Exclusion Rule</h3>
                <form onSubmit={handleAddExclusion} className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-zinc-300 block mb-1">Domain Pattern</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. *.bank.com"
                      value={newDomainPattern}
                      onChange={(e) => setNewDomainPattern(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#181824] border border-[#272738] text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-zinc-300 block mb-1">Reason (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Private banking session"
                      value={newReason}
                      onChange={(e) => setNewReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#181824] border border-[#272738] text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition shadow-glow-amber flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {submitting ? 'Adding...' : 'Add Exclusion'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* Session Detail Drawer */}
      {selectedDomain && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDomain(null)}>
          <div
            className="w-full max-w-sm h-full bg-[#121218] border-l border-[#242436] p-6 overflow-y-auto animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white font-['Outfit']">Session Detail</h3>
              <button
                onClick={() => setSelectedDomain(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1c1c28] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">{selectedDomain.domain}</span>
              </div>

              {selectedDomain.category && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Category: <span className="text-white">{selectedDomain.category}</span></span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#161622] border border-[#222232] grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Total Time</span>
                  <span className="font-bold text-white font-mono">{selectedDomain.totalMinutes}m</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Sessions</span>
                  <span className="font-bold text-white font-mono">{selectedDomain.sessionCount}</span>
                </div>
              </div>

              {selectedDomain.isDistraction && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-semibold">
                  Flagged as a distraction domain
                </div>
              )}

              <p className="text-[11px] text-zinc-500 leading-relaxed pt-2 border-t border-[#1c1c28]">
                Per-domain aggregate shown here (start/end/browser-instance/device breakdown appears once the backend's
                per-session detail endpoint is available for this domain — this drawer already renders whatever fields
                the API returns, so it will populate automatically as those fields land).
              </p>

              {Object.entries(selectedDomain)
                .filter(([k]) => !['domain', 'category', 'totalMinutes', 'sessionCount', 'isDistraction'].includes(k))
                .map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-[#1c1c28] pt-2">
                    <span className="uppercase tracking-wide">{k}</span>
                    <span className="text-white font-mono">{String(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
