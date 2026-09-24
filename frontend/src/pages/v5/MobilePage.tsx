import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Key, Copy, UploadCloud, Info, ShieldQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';
import { v5Api, MobilePermission, DataSourceRow } from '../../services/v5.service';

const DEVICE_STATUS_STYLES: Record<string, string> = {
  Connected: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Permission Required': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Syncing: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  Paused: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  Disconnected: 'bg-zinc-800 text-zinc-500 border-zinc-700',
  Error: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

function mapDeviceStatus(source: DataSourceRow, permissions: MobilePermission[]): string {
  const hasDeniedPermission = permissions.some((p) => p.status === 'DENIED' || p.status === 'NOT_REQUESTED');
  const status = (source.status || '').toUpperCase();
  if (status === 'ERROR') return 'Error';
  if (status === 'PAUSED') return 'Paused';
  if (status === 'SYNCING') return 'Syncing';
  if (status === 'DISCONNECTED') return 'Disconnected';
  if (hasDeniedPermission) return 'Permission Required';
  if (status === 'ACTIVE' || status === 'CONNECTED') return 'Connected';
  return 'Disconnected';
}

export const MobilePage: React.FC = () => {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [permissions, setPermissions] = useState<MobilePermission[]>([]);
  const [mobileSources, setMobileSources] = useState<DataSourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [permRes, sourcesRes] = await Promise.allSettled([
        v5Api.mobile.getPermissions(),
        v5Api.dataSources.list(),
      ]);
      if (permRes.status === 'fulfilled') setPermissions(Array.isArray(permRes.value) ? permRes.value : []);
      if (sourcesRes.status === 'fulfilled') {
        const all = Array.isArray(sourcesRes.value) ? sourcesRes.value : [];
        setMobileSources(all.filter((s) => (s.sourceType || '').toUpperCase() === 'MOBILE_APP'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateCode = async () => {
    setLinkLoading(true);
    setLinkError(null);
    try {
      const res = await v5Api.mobile.generateLinkToken();
      setLinkCode(res.code);
      await loadData();
    } catch (e: any) {
      setLinkError(e?.message || 'Failed to generate a link code. The mobile linking endpoint may not be available yet.');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCopy = () => {
    if (!linkCode) return;
    navigator.clipboard?.writeText(linkCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            V5.1 MOBILE
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit'] flex items-center gap-2.5">
          <Smartphone className="w-7 h-7 text-amber-400" />
          Mobile Devices
        </h1>
        <p className="text-sm text-zinc-400">
          Link a mobile device via a one-time code, monitor connection &amp; permission status, and see what's actually available today.
        </p>
      </div>

      {/* Add Mobile Device */}
      <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c] space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Key className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-['Outfit']">Add Mobile Device</h3>
            <p className="text-[11px] text-zinc-400">Generate a link code and scan it from your device (or enter it manually).</p>
          </div>
        </div>

        <button
          onClick={handleGenerateCode}
          disabled={linkLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition disabled:opacity-50"
        >
          <Key className="w-3.5 h-3.5" />
          {linkLoading ? 'Generating...' : 'Generate Link Code'}
        </button>

        {linkError && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs">
            {linkError}
          </div>
        )}

        {linkCode && (
          <div className="p-5 rounded-xl bg-[#0d0d14] border border-indigo-500/20 flex flex-col sm:flex-row items-center gap-5">
            <div className="p-3 bg-white rounded-xl shrink-0">
              <QRCodeSVG value={linkCode} size={140} level="M" />
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-[11px] text-zinc-400">Scan this code from the FocusOS mobile app, or enter it manually:</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-emerald-300 bg-[#101018] border border-[#222232] rounded-lg px-3 py-2">
                  {linkCode}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-[#171724] hover:bg-[#202030] text-zinc-300 border border-[#2b2b3d] transition"
                  title="Copy code"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              {copied && <p className="text-[10px] text-emerald-400">Copied to clipboard.</p>}
            </div>
          </div>
        )}
      </div>

      {/* Device Status List */}
      <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
        <h3 className="text-sm font-bold text-white font-['Outfit'] mb-4">Device Status</h3>
        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-500">Loading device status...</div>
        ) : mobileSources.length > 0 ? (
          <div className="space-y-2">
            {mobileSources.map((s) => {
              const status = mapDeviceStatus(s, permissions);
              return (
                <div key={s.id} className="p-3.5 rounded-xl bg-[#161622] border border-[#222232] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-white truncate">{s.label || s.deviceName || s.id}</span>
                    <p className="text-[11px] text-zinc-400">
                      {s.lastSyncAt ? `Last sync: ${new Date(s.lastSyncAt).toLocaleString()}` : 'No sync activity yet'}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${DEVICE_STATUS_STYLES[status]}`}>
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-xl">
            No mobile devices linked yet.
          </div>
        )}
      </div>

      {/* Permissions Table */}
      <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
        <div className="flex items-center gap-2 mb-4">
          <ShieldQuestion className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white font-['Outfit']">Permissions</h3>
        </div>
        {permissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="text-[10px] uppercase bg-[#0d0d14] text-zinc-500 border-b border-[#20202c]">
                <tr>
                  <th className="px-3 py-2">Permission</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last Checked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c28]">
                {permissions.map((p, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-semibold text-white">{p.permission}</td>
                    <td className="px-3 py-2">{p.status}</td>
                    <td className="px-3 py-2 font-mono text-zinc-500">
                      {p.lastCheckedAt ? new Date(p.lastCheckedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">No permission records yet — link a device to begin tracking permission state.</p>
        )}
      </div>

      {/* Honest fallback / unavailable messaging */}
      <div className="p-6 rounded-2xl bg-[#12141b] border border-amber-500/20 space-y-3">
        <div className="flex items-center gap-2 text-amber-300">
          <Info className="w-4 h-4" />
          <h3 className="text-sm font-bold font-['Outfit']">What's actually available today</h3>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          There is no native FocusOS mobile client shipping yet. The link/sync architecture above is real and testable
          (a mobile app or a mock client can sync through it), but until a client exists, live mobile telemetry —
          screen time, app usage, notifications — is <strong className="text-amber-300">data unavailable through the
          current device integration</strong>, not silently zero.
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed">
          <strong className="text-white">Screenshot upload remains the working fallback path today</strong> for
          getting mobile usage into FocusOS — manually capture and upload your phone's screen time screenshots.
        </p>
        <Link
          to="/uploads"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          Go to Upload Center
        </Link>
      </div>
    </div>
  );
};
