import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileImage,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Smartphone,
  Laptop,
  ArrowRight,
  Clock,
  Trash2,
  Layers,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Device, UploadItem } from '../types/index.js';

export const UploadCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [recentUploads, setRecentUploads] = useState<UploadItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  const loadInitialData = async () => {
    try {
      const [devRes, upRes] = await Promise.all([api.getDevices(), api.getUploads()]);
      setDevices(devRes.devices);
      if (devRes.devices.length > 0) {
        setSelectedDeviceId(devRes.devices[0].id);
      }
      setRecentUploads(upRes.uploads);
    } catch (err) {
      console.error('Failed to load upload center data:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = Array.from(e.dataTransfer.files).filter((f) =>
        ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(f.type)
      );
      setSelectedFiles((prev) => [...prev, ...filesArr]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArr]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Quick-Load Realistic Sample Test Screenshots
   */
  const handleLoadSampleScreenshots = () => {
    // Generate virtual File objects representing the 3 primary user screenshot archetypes
    const f1 = new File(['android_digital_wellbeing_sample'], 'android_digital_wellbeing.png', {
      type: 'image/png',
    });
    const f2 = new File(['windows_laptop_battery_sample'], 'windows_laptop_battery.png', {
      type: 'image/png',
    });
    const f3 = new File(['shorts_reels_tracker_sample'], 'shorts_reels_tracker.png', {
      type: 'image/png',
    });

    setSelectedFiles([f1, f2, f3]);
  };

  const handleSubmitUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadStatus('Uploading & running multi-device OCR/Vision intelligence...');

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('screenshots', file);
      });
      if (selectedDeviceId) formData.append('deviceId', selectedDeviceId);
      if (targetDate) formData.append('date', targetDate);

      const res = await api.uploadScreenshots(formData);
      setBatchResults(res.uploads || []);
      setSelectedFiles([]);
      setUploadStatus('Screenshots analyzed successfully!');

      // Reload upload history
      const upRes = await api.getUploads();
      setRecentUploads(upRes.uploads);

      // If we have extractions, navigate to review for the first one
      if (res.uploads && res.uploads.length > 0) {
        setTimeout(() => {
          navigate(`/review?id=${res.uploads[0].extractionId}`);
        }, 1200);
      }
    } catch (err: any) {
      setUploadStatus(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold uppercase tracking-wider mb-1">
          <UploadCloud className="w-4 h-4" />
          <span>Screenshot Intelligence Pipeline</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white font-['Outfit']">
          Upload Daily Telemetry Screenshots
        </h1>
        <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed mt-1">
          Upload screenshots taken at bedtime from your phone (Digital Wellbeing / Reels Tracker) and
          laptop (Battery & App Usage). Our AI extracts applications, active durations, reel counts,
          and unlock statistics for your review.
        </p>
      </div>

      {/* Upload Setup Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Drag & Drop Dropzone */}
        <div className="md:col-span-2 space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#2b2b3d] hover:border-amber-500/50 bg-[#121218] hover:bg-[#151520] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 group-hover:border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 transition shadow-glow-amber">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              Drag & Drop Screenshots Here, or Click to Browse
            </h3>
            <p className="text-xs text-zinc-400 mb-3">
              Supports Android Digital Wellbeing, Windows/macOS Battery Usage, Reels Tracker (PNG, JPG, WEBP up to 15MB)
            </p>
            <span className="text-[11px] px-3 py-1 rounded-full bg-[#1c1c28] text-zinc-400 border border-[#272738]">
              Multi-file batch upload enabled
            </span>
          </div>

          {/* Quick Demo Test Loader */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#171724] to-[#12121a] border border-[#262638] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Test With Realistic Sample Screenshots
                </span>
                <span className="text-[11px] text-zinc-400">
                  Pre-loads Android Wellbeing (6h 08m), Windows Brave (1h 01m active), & 698 Reels tracker
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLoadSampleScreenshots}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/40 transition shrink-0"
            >
              Load Sample Batch
            </button>
          </div>

          {/* Selected Files Queue */}
          {selectedFiles.length > 0 && (
            <div className="p-4 rounded-xl bg-[#121218] border border-[#242436] space-y-3">
              <div className="flex items-center justify-between border-b border-[#20202e] pb-2">
                <span className="text-xs font-bold text-white">
                  Queued Files ({selectedFiles.length})
                </span>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-[11px] text-zinc-400 hover:text-red-400 transition"
                >
                  Clear Queue
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#181824] border border-[#232334] text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileImage className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-medium text-zinc-200 truncate">{file.name}</span>
                      <span className="text-[10px] text-zinc-500">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                      className="text-zinc-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Upload Button */}
              <button
                disabled={isUploading}
                onClick={handleSubmitUpload}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-glow-amber"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin"></div>
                    <span>Processing Extraction...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI/OCR Extraction & Proceed to Review ({selectedFiles.length} files)</span>
                  </>
                )}
              </button>

              {uploadStatus && (
                <p className="text-center text-xs text-amber-400/90 animate-pulse">
                  {uploadStatus}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Upload Configuration Metadata */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#121218] border border-[#20202c] space-y-4">
            <h3 className="text-sm font-bold text-white font-['Outfit'] border-b border-[#20202e] pb-2">
              Metadata & Target Device
            </h3>

            {/* Target Date */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                Telemetry Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#181824] border border-[#272738] text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Device Selector */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                Primary Target Device
              </label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#181824] border border-[#272738] text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.os})
                  </option>
                ))}
              </select>
            </div>

            {/* Pipeline Features Checklist */}
            <div className="pt-2 border-t border-[#20202e] space-y-2 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>SHA-256 duplicate image detection</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Active vs background duration split</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Reel counts & shorts consumption tracking</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Human review before database commit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Uploads Table */}
      <div className="p-6 rounded-2xl bg-[#121218] border border-[#20202c]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white font-['Outfit']">
              Upload History & Telemetry Log
            </h3>
            <p className="text-xs text-zinc-400">
              Track status of previously processed screenshots and review states
            </p>
          </div>
        </div>

        {isLoadingHistory ? (
          <div className="py-8 text-center text-xs text-zinc-500">Loading history...</div>
        ) : recentUploads.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No screenshots uploaded yet. Drop your first screenshot above!
          </div>
        ) : (
          <div className="divide-y divide-[#1e1e2c]">
            {recentUploads.map((up) => (
              <div key={up.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#1c1c28] border border-[#272738] flex items-center justify-center text-zinc-400 shrink-0">
                    <FileImage className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-white block truncate">
                      {up.originalName}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {up.device} • {new Date(up.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {up.extraction && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1c1c28] text-zinc-300 border border-[#2c2c3e]">
                      {up.extraction.classification.replace(/_/g, ' ')}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      up.status === 'CONFIRMED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : up.status === 'DUPLICATE'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}
                  >
                    {up.status}
                  </span>

                  {up.extraction && up.status !== 'CONFIRMED' && (
                    <button
                      onClick={() => navigate(`/review?id=${up.extraction!.id}`)}
                      className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] border border-amber-500/40 transition flex items-center gap-1"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
