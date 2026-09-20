import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Clock, AlertTriangle, ArrowRight, X, Loader2 } from 'lucide-react';
import { v4Api } from '../../services/v4.service';

interface ApprovalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onActionComplete?: () => void;
}

export const ApprovalDrawer: React.FC<ApprovalDrawerProps> = ({ isOpen, onClose, onActionComplete }) => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [pending, setPending] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadApprovals();
    }
  }, [isOpen]);

  const loadApprovals = async () => {
    setIsLoading(true);
    try {
      const [pendingData, historyData] = await Promise.all([
        v4Api.getPendingApprovals(),
        v4Api.getApprovalHistory(),
      ]);
      setPending(pendingData);
      setHistory(historyData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setProcessingId(id);
    try {
      await v4Api.reviewApproval(id, decision);
      await loadApprovals();
      if (onActionComplete) onActionComplete();
    } catch (e: any) {
      alert(`Error processing decision: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0e0e14] border-l border-[#242436] h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#212130] bg-[#12121c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Human-in-the-Loop Control
                {pending.length > 0 && (
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {pending.length} Pending
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-zinc-400">Autonomous actions requiring explicit user review</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f2e]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="px-4 py-2 border-b border-[#1b1b26] flex gap-2 bg-[#0a0a0f]">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'PENDING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Pending Actions ({pending.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'HISTORY'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Audit History ({history.length})
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs">Loading approval queue...</p>
            </div>
          ) : activeTab === 'PENDING' ? (
            pending.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 text-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
                <p className="font-semibold text-zinc-300">All clear! No pending actions.</p>
                <p className="text-[11px] text-zinc-500 mt-1">Autonomous agents will request confirmation before any high-impact actions.</p>
              </div>
            ) : (
              pending.map((item) => {
                let preview: any = {};
                try {
                  preview = JSON.parse(item.previewData);
                } catch {
                  preview = {};
                }

                return (
                  <div key={item.id} className="p-4 rounded-xl bg-[#14141e] border border-[#262638] space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                            {item.riskLevel}
                          </span>
                          <span className="text-[10px] text-zinc-400">By {item.requestedBy}</span>
                        </div>
                        <h3 className="text-xs font-bold text-zinc-100">{item.title}</h3>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>

                    {/* Preview Box */}
                    <div className="p-3 rounded-lg bg-[#0b0b10] border border-[#1e1e2c] text-[11px] font-mono space-y-1">
                      <div className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] mb-1">Proposed Execution Parameters</div>
                      {Object.entries(preview).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-zinc-300">
                          <span className="text-zinc-500">{k}:</span>
                          <span className="text-amber-300 font-semibold">{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        disabled={processingId === item.id}
                        onClick={() => handleDecision(item.id, 'APPROVED')}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve & Execute
                      </button>
                      <button
                        disabled={processingId === item.id}
                        onClick={() => handleDecision(item.id, 'REJECTED')}
                        className="py-2 px-3 rounded-lg bg-[#1f1f2b] hover:bg-red-500/20 hover:text-red-300 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-[#2b2b3d]"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            history.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 text-xs">No audit logs recorded yet.</div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-[#12121a] border border-[#20202e] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">{item.title}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      item.status === 'EXECUTED' ? 'bg-emerald-500/20 text-emerald-300' :
                      item.status === 'REJECTED' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">{item.resultSummary || item.description}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {new Date(item.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};
