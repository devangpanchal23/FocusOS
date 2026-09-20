import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Trash2, Play, CheckCircle, AlertTriangle, ShieldCheck, History } from 'lucide-react';
import { api } from '../services/api';
import { AutomationRule, AutomationLog } from '../types';

export const AutomationPage: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('REELS_LIMIT');
  const [thresholdValue, setThresholdValue] = useState('45');
  const [actionType, setActionType] = useState('SHOW_NOTIFICATION');
  const [actionTarget, setActionTarget] = useState('Instagram');

  const loadData = async () => {
    try {
      setLoading(true);
      const [rData, lData] = await Promise.all([
        api.getAutomationRules(),
        api.getAutomationLogs(25),
      ]);
      setRules(rData);
      setLogs(lData);
    } catch (err) {
      console.error('Failed to load automations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !thresholdValue) return;

    try {
      await api.createAutomationRule({
        name: name.trim(),
        triggerType,
        conditionOperator: 'GREATER_THAN',
        thresholdValue,
        actionType,
        actionTarget,
      });
      setShowAddModal(false);
      setName('');
      loadData();
    } catch (err) {
      console.error('Failed to create rule:', err);
    }
  };

  const handleToggle = async (rule: AutomationRule) => {
    try {
      await api.updateAutomationRule(rule.id, { isEnabled: !rule.isEnabled });
      loadData();
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;
    try {
      await api.deleteAutomationRule(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleEvaluateNow = async () => {
    try {
      setEvaluating(true);
      const res = await api.evaluateAutomations();
      setEvalResult(`Evaluated ${res.evaluated} rules. ${res.triggered} triggered.`);
      loadData();
      setTimeout(() => setEvalResult(null), 5000);
    } catch (err) {
      console.error('Failed to run automations:', err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Cpu className="w-7 h-7 text-cyan-400 fill-cyan-400/20" />
            Smart Automations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Build reactive IF &rarr; THEN behavioral policies that enforce digital wellbeing automatically.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleEvaluateNow}
            disabled={evaluating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-medium text-xs transition active:scale-95 disabled:opacity-50"
          >
            <Play className="w-4 h-4 text-cyan-400" />
            <span>{evaluating ? 'Evaluating...' : 'Run Rules Now'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Automation</span>
          </button>
        </div>
      </div>

      {evalResult && (
        <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>{evalResult}</span>
        </div>
      )}

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.length === 0 ? (
          <div className="col-span-full bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
            No automation rules configured. Click "New Automation" to create smart behavior triggers.
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                rule.isEnabled
                  ? 'bg-slate-900/80 border-slate-800 shadow-sm'
                  : 'bg-slate-950/40 border-slate-800/40 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    Rule
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      rule.isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {rule.isEnabled ? 'ACTIVE' : 'MUTED'}
                  </span>
                </div>

                <h4 className="text-base font-bold text-white">{rule.name}</h4>

                {/* IF - THEN visual pill */}
                <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-400 uppercase text-[10px] mt-0.5">IF</span>
                    <span className="text-slate-300">
                      {rule.triggerType.replace(/_/g, ' ')} &gt;{' '}
                      <strong className="text-white">{rule.thresholdValue} min</strong>
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-400 uppercase text-[10px] mt-0.5">THEN</span>
                    <span className="text-slate-300">
                      {rule.actionType.replace(/_/g, ' ')} on{' '}
                      <strong className="text-white">{rule.actionTarget}</strong>
                    </span>
                  </div>
                </div>

                {rule.lastTriggeredAt && (
                  <div className="text-[11px] text-slate-500 mt-3">
                    Last triggered: {new Date(rule.lastTriggeredAt).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleToggle(rule)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    rule.isEnabled
                      ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-800/40 text-slate-500'
                  }`}
                >
                  {rule.isEnabled ? 'Disable' : 'Enable'}
                </button>

                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                  title="Delete rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Execution Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" /> Automation Trigger Logs
          </h3>
          <span className="text-xs text-slate-500">Real-time telemetry evaluations</span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No automation trigger logs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/40 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Rule Name</th>
                  <th className="px-4 py-3">Evaluation Output / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {new Date(log.triggeredAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {log.rule?.name || 'Automation Rule'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Automation */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create Automation Rule</h3>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warn when Reels exceed 45m"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Trigger Condition (IF)
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="REELS_LIMIT">Short-Form / Reels Time Exceeds</option>
                  <option value="SCREEN_TIME_LIMIT">Total Daily Screen Time Exceeds</option>
                  <option value="REEL_COUNT_LIMIT">Reel Count Watched Exceeds</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Threshold Value (Minutes or Count)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Action (THEN)
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="SHOW_NOTIFICATION">Show Alert Notification</option>
                  <option value="BLOCK_APP">Automatically Restrict App</option>
                  <option value="WARN">Gentle Mindful Warning</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Application / Category
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Instagram, YouTube, Social Media"
                  value={actionTarget}
                  onChange={(e) => setActionTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

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
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-lg shadow-cyan-500/25"
                >
                  Save Automation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
