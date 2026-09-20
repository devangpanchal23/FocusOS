import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Database, Calendar, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { api, getAuthToken } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.getTrends(7);
        setTrends(data);
      } catch (err) {
        console.error('Failed to load reports data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDownload = async (type: 'csv' | 'json') => {
    try {
      setDownloading(type);
      const token = getAuthToken();
      const res = await fetch(`/api/export/${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'csv' ? 'focus-intelligence-telemetry.csv' : 'focus-intelligence-backup.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(null);
    }
  };

  const handlePrintDigest = () => {
    const token = getAuthToken();
    // Open digest in a new tab with auth token if needed, or trigger print
    const digestWindow = window.open(`/api/export/digest`, '_blank');
    if (digestWindow) {
      digestWindow.focus();
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-indigo-400 fill-indigo-400/20" />
            Reports & Data Export
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Export confirmed telemetry, download complete JSON backups, or generate print-ready executive digests.
          </p>
        </div>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CSV Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">CSV Spreadsheet</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Raw tabular dataset containing every confirmed application record, active duration, category, and date.
            </p>
          </div>
          <button
            onClick={() => handleDownload('csv')}
            disabled={downloading === 'csv'}
            className="mt-6 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{downloading === 'csv' ? 'Exporting CSV...' : 'Download CSV'}</span>
          </button>
        </div>

        {/* JSON Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Full JSON Backup</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Complete data portability. Includes account settings, daily metrics, focus sessions, routines, and achievements.
            </p>
          </div>
          <button
            onClick={() => handleDownload('json')}
            disabled={downloading === 'json'}
            className="mt-6 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
          >
            <Database className="w-4 h-4" />
            <span>{downloading === 'json' ? 'Exporting JSON...' : 'Download JSON Backup'}</span>
          </button>
        </div>

        {/* Printable HTML Digest Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Printable Executive Digest</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Visually styled report formatted for high-definition desktop presentation, client sharing, or direct 1-click PDF printing.
            </p>
          </div>
          <button
            onClick={handlePrintDigest}
            className="mt-6 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Open Executive Digest / PDF</span>
          </button>
        </div>
      </div>

      {/* 7-Day Performance Telemetry Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" /> Recent 7-Day Telemetry Breakdown
          </h3>
          <span className="text-xs text-slate-500">Verified multi-device dataset</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading telemetry...</div>
        ) : !trends?.trendData ? (
          <div className="py-12 text-center text-slate-500 text-sm">No recent telemetry records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/40 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total Screen Time</th>
                  <th className="px-4 py-3">Productive Time</th>
                  <th className="px-4 py-3">Short-Form Content</th>
                  <th className="px-4 py-3">Reels Logged</th>
                  <th className="px-4 py-3">Attention Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trends.trendData.map((d: any) => (
                  <tr key={d.date} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-semibold text-white">
                      {d.date} <span className="text-xs text-slate-500">({d.day})</span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {Math.floor(d.screenTimeMinutes / 60)}h {d.screenTimeMinutes % 60}m
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-medium">
                      {Math.floor(d.productiveMinutes / 60)}h {d.productiveMinutes % 60}m
                    </td>
                    <td className="px-4 py-3 text-rose-400 font-medium">
                      {Math.floor(d.shortFormMinutes / 60)}h {d.shortFormMinutes % 60}m
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {d.reelCount} reels
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-bold text-xs px-2.5 py-0.5 rounded-full ${
                          d.attentionScore >= 70
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {d.attentionScore} / 100
                      </span>
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
