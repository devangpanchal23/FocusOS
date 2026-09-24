import React, { useState } from 'react';
import { Download, Trash2, AlertTriangle, FileJson, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { v5Api } from '../../services/v5.service';

const SOURCE_TYPES = ['', 'SCREENSHOT_UPLOAD', 'BROWSER_EXTENSION', 'DESKTOP_AGENT', 'MOBILE_APP', 'MANUAL'];

export const DataManagementPage: React.FC = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [deviceId, setDeviceId] = useState('');

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [purging, setPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  const filters = {
    from: from || undefined,
    to: to || undefined,
    sourceType: sourceType || undefined,
    deviceId: deviceId || undefined,
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await v5Api.dataManagement.export({ format, ...filters });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focusos-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setExportError(e?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handlePurge = async () => {
    if (purgeConfirmText !== 'DELETE') return;
    setPurging(true);
    setPurgeError(null);
    setPurgeResult(null);
    try {
      const res = await v5Api.dataManagement.purge(filters);
      setPurgeResult(
        typeof res?.deletedCount === 'number'
          ? `Deleted ${res.deletedCount} event(s).`
          : 'Purge request completed.'
      );
      setShowPurgeModal(false);
      setPurgeConfirmText('');
    } catch (e: any) {
      setPurgeError(e?.message || 'Purge failed.');
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
            V5.1 DATA MANAGEMENT
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">Data Management</h1>
        <p className="text-sm text-zinc-400">Export or permanently delete your tracked event data, filtered by date, source, or device.</p>
      </div>

      {/* Filters */}
      <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c] space-y-4">
        <h3 className="text-sm font-bold text-white font-['Outfit']">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#181824] border border-[#272738] text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#181824] border border-[#272738] text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">Source Type</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#181824] border border-[#272738] text-white focus:outline-none"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t ? t.replace(/_/g, ' ') : 'All Sources'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-zinc-300 block mb-1">Device ID (optional)</label>
            <input
              type="text"
              placeholder="device id"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#181824] border border-[#272738] text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c] space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white font-['Outfit']">Export Data</h3>
        </div>
        <p className="text-[11px] text-zinc-400">Downloads a file of your matching UnifiedEvent/RawEvent records.</p>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport('json')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171724] hover:bg-[#202030] text-zinc-200 border border-[#2b2b3d] font-semibold text-xs transition disabled:opacity-50"
          >
            <FileJson className="w-4 h-4 text-amber-400" />
            {exporting ? 'Exporting...' : 'Export JSON'}
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171724] hover:bg-[#202030] text-zinc-200 border border-[#2b2b3d] font-semibold text-xs transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
        {exportError && <p className="text-[11px] text-rose-400">{exportError}</p>}
      </div>

      {/* Purge */}
      <div className="p-6 rounded-2xl bg-[#1a0f12] border border-rose-500/20 space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold text-white font-['Outfit']">Delete Data</h3>
        </div>
        <p className="text-[11px] text-rose-300/80">
          Permanently deletes matching events. This cannot be undone. Narrow your filters above before deleting.
        </p>
        <button
          onClick={() => setShowPurgeModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
        >
          <ShieldAlert className="w-4 h-4" />
          Delete Matching Data
        </button>
        {purgeResult && <p className="text-[11px] text-emerald-400">{purgeResult}</p>}
      </div>

      {/* Confirm modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#121218] border border-rose-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-bold text-white font-['Outfit']">Confirm Permanent Deletion</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              This will permanently delete all events matching your current filters. Type <strong className="text-rose-300">DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={purgeConfirmText}
              onChange={(e) => setPurgeConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full px-3 py-2 rounded-lg bg-[#181824] border border-rose-500/30 text-white text-xs focus:outline-none focus:border-rose-500 mb-4"
            />
            {purgeError && <p className="text-[11px] text-rose-400 mb-3">{purgeError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPurgeModal(false);
                  setPurgeConfirmText('');
                  setPurgeError(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePurge}
                disabled={purgeConfirmText !== 'DELETE' || purging}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition disabled:opacity-40"
              >
                {purging ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
