import React, { useState, useEffect } from 'react';
import { RotateCw, RefreshCw, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { v5Api } from '../../services/v5.service';

export const SyncCenterPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await v5Api.syncCenter.list();
      setRows(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.message || 'Unable to load the sync center yet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRetry = async (dataSourceId: string) => {
    setRetryingId(dataSourceId);
    try {
      await v5Api.syncCenter.retry(dataSourceId);
      await load();
    } catch (e: any) {
      alert(`Retry failed: ${e.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              V5.1 SYNC CENTER
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit'] flex items-center gap-2.5">
            <RotateCw className="w-7 h-7 text-indigo-400" />
            Sync Center
          </h1>
          <p className="text-sm text-zinc-400">Per-source sync state with pending/failed/retry counts and manual retry.</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1c1c28] transition" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs">{error}</div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-zinc-500">Loading sync state...</div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-2xl">
          No sources registered yet — nothing to sync.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((row, idx) => (
            <div key={row.dataSourceId || row.id || idx} className="p-5 rounded-2xl bg-[#121218] border border-[#20202c] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{row.label || row.sourceType || row.id}</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    row.currentState === 'SYNCING'
                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                      : row.currentState === 'ERROR' || row.failedCount > 0
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {row.currentState || 'IDLE'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#161622] border border-[#222232]">
                  <span className="text-[10px] text-zinc-500 uppercase block">Last Sync</span>
                  <span className="text-white font-mono">
                    {row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString() : 'Never'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161622] border border-[#222232]">
                  <span className="text-[10px] text-zinc-500 uppercase block">Next Sync</span>
                  <span className="text-white font-mono">
                    {row.nextSyncAt ? new Date(row.nextSyncAt).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161622] border border-[#222232] flex items-center gap-1.5">
                  <Clock3 className="w-3 h-3 text-amber-400" />
                  <span className="text-zinc-400">Pending:</span>
                  <span className="text-white font-mono ml-auto">{row.pendingCount ?? 0}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161622] border border-[#222232] flex items-center gap-1.5">
                  <XCircle className="w-3 h-3 text-rose-400" />
                  <span className="text-zinc-400">Failed:</span>
                  <span className="text-white font-mono ml-auto">{row.failedCount ?? 0}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#161622] border border-[#222232] flex items-center gap-1.5 col-span-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-zinc-400">Retry attempts:</span>
                  <span className="text-white font-mono ml-auto">{row.retryCount ?? 0}</span>
                </div>
              </div>

              <button
                onClick={() => handleRetry(row.dataSourceId || row.id)}
                disabled={retryingId === (row.dataSourceId || row.id)}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <RotateCw className={`w-3.5 h-3.5 ${retryingId === (row.dataSourceId || row.id) ? 'animate-spin' : ''}`} />
                {retryingId === (row.dataSourceId || row.id) ? 'Retrying...' : 'Retry Now'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
