import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertTriangle } from 'lucide-react';
import { v5Api, DataSourceRow } from '../../services/v5.service';

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  ACTIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  SYNCING: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  PAUSED: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ERROR: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  DISCONNECTED: 'bg-zinc-800 text-zinc-500 border-zinc-700',
};

function statusClass(status?: string) {
  return STATUS_STYLES[(status || '').toUpperCase()] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
}

export const DataSourcesPage: React.FC = () => {
  const [rows, setRows] = useState<DataSourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await v5Api.dataSources.list();
      setRows(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.message || 'Unable to load data sources yet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              V5 DATA SOURCES
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit'] flex items-center gap-2.5">
            <Database className="w-7 h-7 text-emerald-400" />
            Data Sources
          </h1>
          <p className="text-sm text-zinc-400">Every connected ingestion source, its live status, and per-status event counts.</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1c1c28] transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs">{error}</div>
      )}

      <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">Loading data sources...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-xl">
            No data sources registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="text-[10px] uppercase bg-[#0d0d14] text-zinc-500 border-b border-[#20202c]">
                <tr>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Sync</th>
                  <th className="px-4 py-3">Event Counts</th>
                  <th className="px-4 py-3">Last Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c28]">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-[#161622] transition">
                    <td className="px-4 py-3 font-semibold text-white">{r.label || r.id}</td>
                    <td className="px-4 py-3">{(r.sourceType || '—').replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">{r.deviceName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusClass(r.status)}`}>
                        {r.status || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-500">
                      {r.lastSyncAt ? new Date(r.lastSyncAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      {r.eventCounts?.byStatus ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(r.eventCounts.byStatus).map(([k, v]) => (
                            <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1c1c28] border border-[#272738] font-mono">
                              {k}:{v}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.lastError ? (
                        <span className="flex items-center gap-1 text-rose-300 text-[11px]">
                          <AlertTriangle className="w-3 h-3" /> {r.lastError}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
