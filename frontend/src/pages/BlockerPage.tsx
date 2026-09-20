import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Lock, Unlock, Plus, Trash2, Clock, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { api } from '../services/api';
import { BlockRule, BlockOverride } from '../types';

export const BlockerPage: React.FC = () => {
  const [rules, setRules] = useState<BlockRule[]>([]);
  const [overrides, setOverrides] = useState<BlockOverride[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [overrideModalRule, setOverrideModalRule] = useState<BlockRule | null>(null);

  // Form State
  const [targetType, setTargetType] = useState<'APP' | 'WEBSITE' | 'CATEGORY'>('APP');
  const [targetValue, setTargetValue] = useState('');
  const [mode, setMode] = useState<'INSTANT' | 'FOCUS_ONLY' | 'SCHEDULED'>('INSTANT');
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('23:00');

  // Override Form State
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideMinutes, setOverrideMinutes] = useState(15);
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rData, oData] = await Promise.all([
        api.getBlockRules(),
        api.getBlockOverrides(),
      ]);
      setRules(rData);
      setOverrides(oData);
    } catch (err) {
      console.error('Failed to load blocker data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (rule: BlockRule) => {
    try {
      await api.updateBlockRule(rule.id, { isEnabled: !rule.isEnabled });
      loadData();
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this block rule?')) return;
    try {
      await api.deleteBlockRule(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue.trim()) return;

    try {
      await api.createBlockRule({
        targetType,
        targetValue: targetValue.trim(),
        mode,
        startTime: mode === 'SCHEDULED' ? startTime : null,
        endTime: mode === 'SCHEDULED' ? endTime : null,
      });
      setShowAddModal(false);
      setTargetValue('');
      loadData();
    } catch (err) {
      console.error('Failed to create block rule:', err);
    }
  };

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalRule || !overrideReason.trim()) return;

    try {
      setOverrideSubmitting(true);
      await api.overrideBlockRule(overrideModalRule.id, {
        reason: overrideReason.trim(),
        overrideDurationMinutes: overrideMinutes,
      });
      setOverrideModalRule(null);
      setOverrideReason('');
      loadData();
    } catch (err) {
      console.error('Failed to submit override:', err);
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const activeBlockedCount = rules.filter((r) => r.isEffectivelyBlocked).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-indigo-400 fill-indigo-400/20" />
            App & Site Blocker
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Intentional friction, scheduled restriction windows, and transparent override auditing.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Block Rule</span>
        </button>
      </div>

      {/* Active Restriction Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {activeBlockedCount > 0
                ? `${activeBlockedCount} App / Target${activeBlockedCount > 1 ? 's' : ''} Currently Restricted`
                : 'No Targets Actively Restricted'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Shield is actively monitoring short-form apps and high-dopamine distractions.
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            ● Blocker Engine Online
          </span>
        </div>
      </div>

      {/* Block Rules List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-white mb-4">Configured Restriction Rules</h3>

        {rules.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            No block rules created yet. Click "Add Block Rule" above to create your first rule.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-5 rounded-xl border transition flex flex-col justify-between ${
                  rule.isEffectivelyBlocked
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : rule.isOverridden
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-950/40 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                      {rule.targetType}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        rule.isEffectivelyBlocked
                          ? 'bg-rose-500/20 text-rose-400'
                          : rule.isOverridden
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {rule.isEffectivelyBlocked
                        ? 'BLOCKED NOW'
                        : rule.isOverridden
                        ? `UNLOCKED (${rule.overrideRemainingMinutes}m left)`
                        : rule.mode}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-white">{rule.targetValue}</h4>

                  <p className="text-xs text-slate-400 mt-1">
                    {rule.mode === 'INSTANT' && 'Continuous full-day restriction'}
                    {rule.mode === 'FOCUS_ONLY' && 'Restricted only during active focus sessions'}
                    {rule.mode === 'SCHEDULED' && `Restricted from ${rule.startTime} to ${rule.endTime}`}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        rule.isEnabled
                          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                          : 'bg-slate-800/40 text-slate-500'
                      }`}
                    >
                      {rule.isEnabled ? 'Enabled' : 'Disabled'}
                    </button>

                    {rule.isEffectivelyBlocked && (
                      <button
                        onClick={() => setOverrideModalRule(rule)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition"
                      >
                        Override
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Delete rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Override History Audit Trail */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" /> Intentional Override Audit Log
          </h3>
          <span className="text-xs text-slate-500">Accountability trail</span>
        </div>

        {overrides.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Zero overrides recorded. Excellent digital discipline!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/40 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Target App</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Declared Intention / Reason</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {overrides.map((ov) => (
                  <tr key={ov.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-semibold text-white">
                      {ov.rule?.targetValue || 'Restricted App'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-amber-400">
                      {ov.overrideDurationMinutes} min
                    </td>
                    <td className="px-4 py-3 text-slate-300 italic">
                      "{ov.reason}"
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(ov.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Block Rule */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Add Restriction Rule</h3>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['APP', 'WEBSITE', 'CATEGORY'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTargetType(t)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                        targetType === t
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {targetType === 'APP' ? 'Application Name' : targetType === 'WEBSITE' ? 'Domain URL' : 'Category'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={targetType === 'APP' ? 'e.g. Instagram, YouTube' : 'e.g. twitter.com'}
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Block Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="INSTANT">Instant (Always Blocked)</option>
                  <option value="FOCUS_ONLY">Focus Only (When Timer is Running)</option>
                  <option value="SCHEDULED">Scheduled (Specific Hours)</option>
                </select>
              </div>

              {mode === 'SCHEDULED' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-500/25"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Intentional Friction Override */}
      {overrideModalRule && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white text-center">
              Temporary Intentional Override
            </h3>
            <p className="text-xs text-slate-400 text-center mt-1">
              You are requesting access to <strong className="text-white">{overrideModalRule.targetValue}</strong>.
              Mindful pause: please declare why you are opening this app.
            </p>

            <form onSubmit={handleCreateOverride} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Why do you need this right now? (Mandatory Intention)
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Reply to critical client DM, check 2FA code..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Override Window Duration
                </label>
                <select
                  value={overrideMinutes}
                  onChange={(e) => setOverrideMinutes(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={5}>5 Minutes (Quick check)</option>
                  <option value={15}>15 Minutes (Standard window)</option>
                  <option value={30}>30 Minutes (Extended)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalRule(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel & Stay Focused
                </button>
                <button
                  type="submit"
                  disabled={overrideSubmitting || overrideReason.trim().length < 4}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-xs transition"
                >
                  {overrideSubmitting ? 'Logging...' : 'Confirm Intentional Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
