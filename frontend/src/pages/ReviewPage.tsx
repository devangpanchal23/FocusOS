import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  FileImage,
  ArrowLeft,
  Smartphone,
  Calendar,
  Layers,
  Edit3,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Extraction } from '../types/index.js';

interface EditableRow {
  fieldKey: string;
  appName: string;
  duration: string;
  activeMinutes: number;
  backgroundMinutes: number;
  reelCount: number;
  shortsMinutes: number;
  category: string;
  confidence: number;
}

export const ReviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const extractionId = searchParams.get('id');

  const [extractionsList, setExtractionsList] = useState<any[]>([]);
  const [currentExtraction, setCurrentExtraction] = useState<Extraction | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [confirmedDate, setConfirmedDate] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const upRes = await api.getUploads();
      const pendingUploads = upRes.uploads.filter((u: any) => u.extraction);
      setExtractionsList(pendingUploads);

      let targetId = extractionId;
      if (!targetId && pendingUploads.length > 0) {
        targetId = pendingUploads[0].extraction.id;
      }

      if (targetId) {
        const extRes = await api.getExtraction(targetId);
        const ext = extRes.extraction;
        setCurrentExtraction(ext);
        setConfirmedDate(ext.detectedDate || new Date().toISOString().split('T')[0]);

        // Parse fields into editable rows
        const parsedRows: EditableRow[] = [];
        for (const f of ext.fields) {
          if (f.fieldKey.startsWith('app:')) {
            let data: any = {};
            try {
              data = JSON.parse(f.detectedValue);
            } catch {
              data = { appName: f.fieldKey.replace('app:', ''), duration: f.detectedValue };
            }

            parsedRows.push({
              fieldKey: f.fieldKey,
              appName: data.appName || f.fieldKey.replace('app:', ''),
              duration: data.duration || f.detectedValue,
              activeMinutes: data.activeMinutes || 0,
              backgroundMinutes: data.backgroundMinutes || 0,
              reelCount: data.reelCount || 0,
              shortsMinutes: data.shortsMinutes || 0,
              category: data.category || f.categorySuggestion || 'Other',
              confidence: f.confidence,
            });
          }
        }
        setRows(parsedRows);
      }
    } catch (err: any) {
      console.error('Failed to load review data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [extractionId]);

  const handleRowChange = (index: number, field: keyof EditableRow, value: any) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleConfirm = async () => {
    if (!currentExtraction) return;
    setIsSubmitting(true);
    setStatusMessage('Normalizing records and recalculating daily analytics...');

    try {
      const editedFields = rows.map((r) => ({
        fieldKey: r.fieldKey,
        appName: r.appName,
        duration: r.duration,
        activeMinutes: Number(r.activeMinutes),
        backgroundMinutes: Number(r.backgroundMinutes),
        reelCount: Number(r.reelCount),
        shortsMinutes: Number(r.shortsMinutes),
        category: r.category,
      }));

      await api.confirmExtraction(currentExtraction.id, {
        editedFields,
        confirmedDate,
      });

      setStatusMessage('Confirmed! Redirecting to live updated dashboard...');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentExtraction) return;
    try {
      await api.rejectExtraction(currentExtraction.id);
      navigate('/uploads');
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
          <p className="text-xs text-zinc-400">Loading extraction details...</p>
        </div>
      </div>
    );
  }

  if (!currentExtraction) {
    return (
      <div className="flex-1 p-8 max-w-4xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#1a1a24] flex items-center justify-center text-zinc-500 mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">No Extractions Pending Review</h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          All uploaded screenshots have already been reviewed and applied to your analytics engine.
        </p>
        <button
          onClick={() => navigate('/uploads')}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition"
        >
          Go to Upload Center
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f1f2c] pb-5">
        <div>
          <button
            onClick={() => navigate('/uploads')}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 mb-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Uploads
          </button>
          <h1 className="text-xl font-black text-white font-['Outfit'] flex items-center gap-2">
            Human Verification & Field Review
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Confidence: {Math.round(currentExtraction.confidence * 100)}%
            </span>
          </h1>
          <p className="text-xs text-zinc-400">
            Verify AI-extracted metrics before committing to the executive dashboard. You can edit any value.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            disabled={isSubmitting}
            onClick={handleReject}
            className="px-4 py-2 rounded-xl bg-[#1c1c28] hover:bg-red-500/10 hover:text-red-400 border border-[#29293c] text-xs font-semibold text-zinc-300 transition flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            <span>Reject</span>
          </button>
          <button
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 shadow-glow-emerald disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm & Apply to Dashboard</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium text-center animate-pulse">
          {statusMessage}
        </div>
      )}

      {/* Side-by-Side Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Original Screenshot Preview */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#121218] border border-[#20202c] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <FileImage className="w-4 h-4 text-amber-400" />
              Original Screenshot Preview
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {currentExtraction.screenshot?.originalName}
            </span>
          </div>

          <div className="flex-1 min-h-[420px] bg-[#0c0c10] border border-[#222230] rounded-xl flex items-center justify-center p-4 relative overflow-hidden">
            {currentExtraction.screenshotUrl ? (
              <img
                src={currentExtraction.screenshotUrl}
                alt="Original screenshot"
                className="max-h-[500px] w-auto object-contain rounded-lg shadow-md"
              />
            ) : (
              <div className="text-center text-xs text-zinc-500">
                <FileImage className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
                <span>Screenshot image preview</span>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#161622] border border-[#232334] text-xs space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Detected Classifier:</span>
              <span className="font-bold text-white font-mono">
                {currentExtraction.screenshotClass}
              </span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Detected Device:</span>
              <span className="font-semibold text-zinc-200">
                {currentExtraction.detectedDevice || 'Android Phone'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Extracted Telemetry Fields Table */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#121218] border border-[#20202c] space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white font-['Outfit']">
                Extracted Applications & Metrics
              </h3>
              <p className="text-xs text-zinc-400">
                Editable before persistence. Durations format: "6h 08m", "21m", "1h 31m"
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="date"
                value={confirmedDate}
                onChange={(e) => setConfirmedDate(e.target.value)}
                className="px-2.5 py-1 rounded-md bg-[#181824] border border-[#272738] text-xs text-zinc-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Fields Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222234] text-zinc-400 font-semibold">
                  <th className="pb-3 pl-1">Application</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Active (m)</th>
                  <th className="pb-3">Reels/Shorts</th>
                  <th className="pb-3 text-right pr-1">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b1b28]">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-[#161622] transition">
                    {/* App Name */}
                    <td className="py-2.5 pl-1">
                      <input
                        type="text"
                        value={row.appName}
                        onChange={(e) => handleRowChange(i, 'appName', e.target.value)}
                        className="w-28 px-2 py-1 rounded bg-[#181824] border border-[#28283a] text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </td>

                    {/* Category */}
                    <td className="py-2.5">
                      <select
                        value={row.category}
                        onChange={(e) => handleRowChange(i, 'category', e.target.value)}
                        className="px-2 py-1 rounded bg-[#181824] border border-[#28283a] text-[11px] text-zinc-300 focus:outline-none"
                      >
                        <option value="Social Media">Social Media</option>
                        <option value="Short-form Content">Short-form Content</option>
                        <option value="Development">Development</option>
                        <option value="Productivity">Productivity</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Communication">Communication</option>
                        <option value="Browser">Browser</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Other">Other</option>
                      </select>
                    </td>

                    {/* Duration string */}
                    <td className="py-2.5">
                      <input
                        type="text"
                        value={row.duration}
                        onChange={(e) => handleRowChange(i, 'duration', e.target.value)}
                        className="w-20 px-2 py-1 rounded bg-[#181824] border border-[#28283a] text-xs font-mono font-semibold text-amber-300 focus:outline-none focus:border-amber-500"
                      />
                    </td>

                    {/* Active minutes */}
                    <td className="py-2.5">
                      <input
                        type="number"
                        value={row.activeMinutes}
                        onChange={(e) =>
                          handleRowChange(i, 'activeMinutes', parseInt(e.target.value, 10) || 0)
                        }
                        className="w-16 px-2 py-1 rounded bg-[#181824] border border-[#28283a] text-xs font-mono text-zinc-300 focus:outline-none"
                      />
                    </td>

                    {/* Reel Count */}
                    <td className="py-2.5">
                      <input
                        type="number"
                        value={row.reelCount}
                        placeholder="0"
                        onChange={(e) =>
                          handleRowChange(i, 'reelCount', parseInt(e.target.value, 10) || 0)
                        }
                        className="w-16 px-2 py-1 rounded bg-[#181824] border border-[#28283a] text-xs font-mono text-rose-300 focus:outline-none"
                      />
                    </td>

                    {/* Confidence badge */}
                    <td className="py-2.5 text-right pr-1">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {Math.round(row.confidence * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-xl bg-[#161622] border border-[#232334] flex items-center justify-between text-xs">
            <span className="text-zinc-400">Total detected records:</span>
            <span className="font-bold text-white font-mono">{rows.length} applications ready to persist</span>
          </div>
        </div>
      </div>
    </div>
  );
};
