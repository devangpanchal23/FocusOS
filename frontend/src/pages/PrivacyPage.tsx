import React, { useState, useEffect } from 'react';
import { v3Api } from '../services/api';
import { PrivacySummary } from '../types';
import {
  ShieldCheck,
  Lock,
  Database,
  Trash2,
  FileText,
  AlertTriangle,
  History,
  CheckCircle2,
  Key,
} from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const [summary, setSummary] = useState<PrivacySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeScope, setPurgeScope] = useState<'SCREENSHOTS_ONLY' | 'USAGE_METRICS_ONLY' | 'ALL_TELEMETRY'>('SCREENSHOTS_ONLY');
  const [purging, setPurging] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await v3Api.getPrivacySummary();
      setSummary(res);
    } catch (err) {
      console.error('Error fetching privacy summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePurge = async () => {
    const confirmPhrase = purgeScope === 'ALL_TELEMETRY' ? 'DELETE ALL' : 'PURGE';
    const userPrompt = prompt(`Type "${confirmPhrase}" to permanently delete selected telemetry records:`);
    if (userPrompt !== confirmPhrase) {
      alert('Action cancelled: phrase did not match.');
      return;
    }

    try {
      setPurging(true);
      const res = await v3Api.purgeData(purgeScope);
      alert(`Success: ${res.details}`);
      setShowPurgeModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to purge data');
    } finally {
      setPurging(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading personal data inventory & security certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Privacy Center & Data Sovereignty</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> GDPR & CCPA Compliant
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Complete ownership of your digital wellbeing data. Verify storage inventory, retention rules, and trigger granular data purges.
          </p>
        </div>

        <button
          onClick={() => setShowPurgeModal(true)}
          className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" /> Selective Data Purge
        </button>
      </div>

      {/* Security Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Encryption at Rest</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{summary.encryptionStatus.atRest}</div>
          <p className="text-xs text-slate-400">
            Hardware-accelerated AES-GCM cipher with isolated per-user salted keys.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">In-Transit Protection</span>
            <Key className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{summary.encryptionStatus.inTransit}</div>
          <p className="text-xs text-slate-400">
            Strict TLS transport pinning. Zero unencrypted cleartext transmissions.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Training Policy</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">Zero AI Training</div>
          <p className="text-xs text-slate-400">
            Your personal telemetry and OCR text is never used to train public LLMs.
          </p>
        </div>
      </div>

      {/* Data Inventory Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Your Personal Data Inventory</h3>
          </div>
          <span className="text-xs text-slate-500">Real-time database records</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Raw Screenshots</span>
            <p className="text-2xl font-black text-white mt-1">{summary.dataInventory.screenshots}</p>
            <span className="text-[10px] text-slate-500 block mt-1">30-day retention</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400">OCR Extractions</span>
            <p className="text-2xl font-black text-white mt-1">{summary.dataInventory.extractions}</p>
            <span className="text-[10px] text-slate-500 block mt-1">Parsed telemetry</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Daily Summaries</span>
            <p className="text-2xl font-black text-white mt-1">{summary.dataInventory.dailyMetrics}</p>
            <span className="text-[10px] text-slate-500 block mt-1">Attention scores</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Focus Sessions</span>
            <p className="text-2xl font-black text-white mt-1">{summary.dataInventory.focusSessions}</p>
            <span className="text-[10px] text-slate-500 block mt-1">Pomodoro intervals</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Shield Rules</span>
            <p className="text-2xl font-black text-white mt-1">{summary.dataInventory.blockRules}</p>
            <span className="text-[10px] text-slate-500 block mt-1">Active site limits</span>
          </div>
        </div>
      </div>

      {/* Immutable Privacy Audit Logs */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Immutable Privacy Audit Log</h3>
          </div>
          <span className="text-xs text-slate-500">Security event trail</span>
        </div>

        {summary.auditLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No privacy events logged yet. Exports and purges will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="uppercase bg-slate-950/40 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Details</th>
                  <th className="px-4 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {summary.auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-bold text-indigo-300 font-mono">{log.action}</td>
                    <td className="px-4 py-2.5 text-slate-300">{log.details}</td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purge Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Granular Data Purge</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This action is permanent and cannot be undone. Select which scope of data you wish to delete from FocusOS servers.
            </p>

            <div className="space-y-2">
              <label
                onClick={() => setPurgeScope('SCREENSHOTS_ONLY')}
                className={`p-3 rounded-xl border block cursor-pointer transition ${
                  purgeScope === 'SCREENSHOTS_ONLY'
                    ? 'bg-slate-800 border-rose-500/50'
                    : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <span className="text-xs font-bold text-white block">Raw Screenshots & Extractions Only</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Deletes original PNG/JPEG screenshot files while retaining calculated daily screen-time metrics.
                </span>
              </label>

              <label
                onClick={() => setPurgeScope('USAGE_METRICS_ONLY')}
                className={`p-3 rounded-xl border block cursor-pointer transition ${
                  purgeScope === 'USAGE_METRICS_ONLY'
                    ? 'bg-slate-800 border-rose-500/50'
                    : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <span className="text-xs font-bold text-white block">Daily Metrics & App Usage Records</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Deletes all calculated application usage and Attention Score histories.
                </span>
              </label>

              <label
                onClick={() => setPurgeScope('ALL_TELEMETRY')}
                className={`p-3 rounded-xl border block cursor-pointer transition ${
                  purgeScope === 'ALL_TELEMETRY'
                    ? 'bg-slate-800 border-rose-500/50'
                    : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <span className="text-xs font-bold text-rose-300 block">Complete Telemetry Wipe</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Purges all screenshots, metrics, app records, and completed focus sessions.
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handlePurge}
                disabled={purging}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> {purging ? 'Purging...' : 'Execute Purge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
