import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Plus,
  Trash2,
  CheckCircle,
  Activity,
  Layers,
  X,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Device } from '../types/index.js';

export const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [deviceType, setDeviceType] = useState<string>('PHONE');
  const [os, setOs] = useState<string>('ANDROID');

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDevices();
      setDevices(res.devices);
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await api.createDevice({ name: name.trim(), deviceType, os });
      setName('');
      setShowAddModal(false);
      fetchDevices();
    } catch (err: any) {
      alert(`Failed to add device: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this device?')) return;
    try {
      await api.deleteDevice(id);
      fetchDevices();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'LAPTOP':
        return <Laptop className="w-5 h-5 text-indigo-400" />;
      case 'DESKTOP':
        return <Monitor className="w-5 h-5 text-purple-400" />;
      case 'TABLET':
        return <Tablet className="w-5 h-5 text-emerald-400" />;
      default:
        return <Smartphone className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
            <Smartphone className="w-4 h-4" />
            <span>Hardware Ecosystem</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white font-['Outfit']">
            Managed Devices & Sources
          </h1>
          <p className="text-xs text-zinc-400">
            Devices mapped to daily screenshot ingestion and battery/screen telemetry
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition shadow-glow-amber"
        >
          <Plus className="w-4 h-4" />
          <span>Add Device</span>
        </button>
      </div>

      {/* Device Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-zinc-500">Loading devices...</div>
      ) : devices.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-[#242436] rounded-2xl">
          No devices registered yet. Add your phone or laptop above!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {devices.map((d) => (
            <div
              key={d.id}
              className="p-5 rounded-2xl bg-[#121218] border border-[#20202c] card-hover flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1a1a26] border border-[#272738] flex items-center justify-center shrink-0">
                    {getDeviceIcon(d.deviceType)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white block">{d.name}</h3>
                    <span className="text-[11px] text-zinc-400">
                      {d.os} • {d.deviceType}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                  title="Remove Device"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#161622] border border-[#222232] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Screenshots</span>
                  <span className="font-bold text-white font-mono">
                    {d._count?.screenshots || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block">Usage Records</span>
                  <span className="font-bold text-white font-mono">
                    {d._count?.usageRecords || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1c1c28]">
                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Telemetry Active</span>
                </div>
                <span className="text-[10px] text-zinc-500">
                  {d.lastSyncAt ? `Last sync: ${new Date(d.lastSyncAt).toLocaleDateString()}` : 'Ready to sync'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#121218] border border-[#272738] rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white font-['Outfit'] mb-1">
              Add New Hardware Device
            </h3>
            <p className="text-xs text-zinc-400 mb-5">
              Assign daily screenshots from this device to its telemetry pool
            </p>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Device Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Pixel 9 Pro or MacBook Pro M3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#181824] border border-[#272738] text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-300 block mb-1">Device Form Factor</label>
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#181824] border border-[#272738] text-white focus:outline-none"
                  >
                    <option value="PHONE">Smartphone</option>
                    <option value="LAPTOP">Laptop</option>
                    <option value="DESKTOP">Desktop PC</option>
                    <option value="TABLET">Tablet</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-zinc-300 block mb-1">Operating System</label>
                  <select
                    value={os}
                    onChange={(e) => setOs(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#181824] border border-[#272738] text-white focus:outline-none"
                  >
                    <option value="ANDROID">Android</option>
                    <option value="WINDOWS">Windows</option>
                    <option value="MACOS">macOS</option>
                    <option value="IOS">iOS</option>
                    <option value="LINUX">Linux</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition mt-2 shadow-glow-amber"
              >
                Register Device
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
