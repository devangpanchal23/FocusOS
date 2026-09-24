import React, { useState, useEffect } from 'react';
import { History, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock3, Ban } from 'lucide-react';
import { v5Api } from '../../services/v5.service';

const CHANNEL_STYLES: Record<string, string> = {
  SENT: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  FAILED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  PENDING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  NOT_CONFIGURED: 'bg-zinc-800 text-zinc-500 border-zinc-700',
};

function channelIcon(status: string) {
  switch (status) {
    case 'SENT':
      return <CheckCircle2 className="w-3 h-3" />;
    case 'FAILED':
      return <XCircle className="w-3 h-3" />;
    case 'PENDING':
      return <Clock3 className="w-3 h-3" />;
    default:
      return <Ban className="w-3 h-3" />;
  }
}

export const AutomationHistoryPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 25;

  const load = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await v5Api.automationHistory.list({ page: p, limit });
      const items = Array.isArray(res) ? res : res?.items || res?.data || [];
      setRows(items);
      setHasMore(
        Array.isArray(res) ? items.length === limit : (res?.hasMore ?? items.length === limit)
      );
    } catch (e: any) {
      setError(e?.message || 'Unable to load automation history yet.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-6xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
            V5.1 AUTOMATION HISTORY
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit'] flex items-center gap-2.5">
          <History className="w-7 h-7 text-cyan-400" />
          Automation History
        </h1>
        <p className="text-sm text-zinc-400">
          Full trigger &amp; delivery history for every automation rule, joined with per-channel delivery status.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs">{error}</div>
      )}

      <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">Loading history...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-xl">
            No automation history recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="text-[10px] uppercase bg-[#0d0d14] text-zinc-500 border-b border-[#20202c]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Rule</th>
                  <th className="px-4 py-3">Trigger</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c28]">
                {rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-[#161622] transition">
                    <td className="px-4 py-3 font-mono text-zinc-500">
                      {row.triggeredAt || row.timestamp ? new Date(row.triggeredAt || row.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{row.rule?.name || row.ruleName || 'Rule'}</td>
                    <td className="px-4 py-3">{(row.triggerType || row.trigger || '—').toString().replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">{(row.actionType || row.action || '—').toString().replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(row.deliveryLogs || row.deliveries || []).length > 0 ? (
                          (row.deliveryLogs || row.deliveries).map((d: any, i: number) => (
                            <span
                              key={i}
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                                CHANNEL_STYLES[d.status] || CHANNEL_STYLES.NOT_CONFIGURED
                              }`}
                            >
                              {channelIcon(d.status)}
                              {d.channel}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-500">{row.message || '—'}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1c1c28]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171724] hover:bg-[#202030] text-zinc-200 border border-[#2b2b3d] text-xs font-semibold transition disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>
          <span className="text-[11px] text-zinc-500 font-mono">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171724] hover:bg-[#202030] text-zinc-200 border border-[#2b2b3d] text-xs font-semibold transition disabled:opacity-40"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
