import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Trash2, Play, CheckCircle, AlertTriangle, ShieldCheck, History, XCircle, FlaskConical, Sliders, X, LayoutTemplate, Webhook, Bell, Mail, Globe2, Timer } from 'lucide-react';
import { api } from '../services/api';
import { automationV5Api, v5Api, AutomationTemplate } from '../services/v5.service';
import { AutomationRule, AutomationLog, AutomationCondition, AutomationTestResult } from '../types';
import {
  ConditionGroupBuilder,
  ConditionGroupNode,
  emptyGroup,
  flattenConditionTree,
} from '../components/v5/ConditionGroupBuilder';

const ADVANCED_TRIGGER_TYPES = ['SCREEN_TIME_LIMIT', 'REELS_LIMIT', 'REEL_COUNT_LIMIT', 'FOCUS_START'];
const ADVANCED_OPERATORS = ['GREATER_THAN', 'LESS_THAN', 'EQUALS'];

const DELIVERY_CHANNELS: { key: string; label: string; icon: any; configured: boolean }[] = [
  { key: 'IN_APP', label: 'In-App', icon: Bell, configured: true },
  { key: 'WEBHOOK', label: 'Webhook', icon: Webhook, configured: true },
  { key: 'EMAIL', label: 'Email', icon: Mail, configured: false },
  { key: 'BROWSER', label: 'Browser Push', icon: Globe2, configured: false },
];

function emptyCondition(): AutomationCondition {
  return {
    triggerType: 'SCREEN_TIME_LIMIT',
    conditionOperator: 'GREATER_THAN',
    thresholdValue: '30',
    scopeValue: '',
    timeWindowStart: '',
    timeWindowEnd: '',
  };
}

export const AutomationPage: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [evalResult, setEvalResult] = useState<string | null>(null);

  // Form State (Simple mode — unchanged behavior)
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('REELS_LIMIT');
  const [thresholdValue, setThresholdValue] = useState('45');
  const [actionType, setActionType] = useState('SHOW_NOTIFICATION');
  const [actionTarget, setActionTarget] = useState('Instagram');

  // V5: Simple/Advanced builder mode
  const [builderMode, setBuilderMode] = useState<'SIMPLE' | 'ADVANCED'>('SIMPLE');
  const [conditions, setConditions] = useState<AutomationCondition[]>([emptyCondition()]);
  const [testResult, setTestResult] = useState<AutomationTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // V5: per-rule "Test Rule" (dry-run against a saved rule)
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [ruleTestResults, setRuleTestResults] = useState<Record<string, AutomationTestResult>>({});

  // V5.1: nested AND/OR condition groups
  const [useGroupedMode, setUseGroupedMode] = useState(false);
  const [groupTree, setGroupTree] = useState<ConditionGroupNode>(emptyGroup('AND'));

  // V5.1: cooldown + delivery channels
  const [cooldownMinutes, setCooldownMinutes] = useState('0');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['IN_APP']);

  // V5.1: rule templates
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [instantiatingKey, setInstantiatingKey] = useState<string | null>(null);

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

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await v5Api.automation.getTemplates();
      setTemplates(Array.isArray(res) ? res : []);
    } catch (err) {
      // non-fatal — template gallery just stays empty
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadTemplates();
  }, []);

  const handleUseTemplate = async (key: string) => {
    setInstantiatingKey(key);
    try {
      await v5Api.automation.instantiateTemplate(key);
      await loadData();
    } catch (err: any) {
      alert(`Failed to instantiate template: ${err.message}`);
    } finally {
      setInstantiatingKey(null);
    }
  };

  const toggleChannel = (key: string, configured: boolean) => {
    if (!configured) return;
    setSelectedChannels((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (builderMode === 'SIMPLE') {
        if (!thresholdValue) return;
        await api.createAutomationRule({
          name: name.trim(),
          triggerType,
          conditionOperator: 'GREATER_THAN',
          thresholdValue,
          actionType,
          actionTarget,
          cooldownMinutes: Number(cooldownMinutes) || 0,
          deliveryChannels: selectedChannels,
        } as any);
      } else if (useGroupedMode) {
        const { groups, conditions: flatConditions } = flattenConditionTree(groupTree);
        await api.createAutomationRule({
          name: name.trim(),
          actionType,
          actionTarget,
          conditionLogic: 'GROUPED',
          conditionGroups: groups,
          conditions: flatConditions,
          cooldownMinutes: Number(cooldownMinutes) || 0,
          deliveryChannels: selectedChannels,
        } as any);
      } else {
        const validConditions = conditions.filter((c) => c.triggerType && c.thresholdValue);
        if (validConditions.length === 0) return;
        // Legacy single-condition columns stay populated from the first row for backward compatibility;
        // conditionLogic/conditions carry the full AND-chain.
        await api.createAutomationRule({
          name: name.trim(),
          triggerType: validConditions[0].triggerType,
          conditionOperator: validConditions[0].conditionOperator,
          thresholdValue: validConditions[0].thresholdValue,
          actionType,
          actionTarget,
          conditionLogic: 'ALL',
          conditions: validConditions.map((c, idx) => ({ ...c, orderIndex: idx })),
          cooldownMinutes: Number(cooldownMinutes) || 0,
          deliveryChannels: selectedChannels,
        } as any);
      }
      resetForm();
      setShowAddModal(false);
      loadData();
    } catch (err) {
      console.error('Failed to create rule:', err);
    }
  };

  const resetForm = () => {
    setName('');
    setTriggerType('REELS_LIMIT');
    setThresholdValue('45');
    setActionType('SHOW_NOTIFICATION');
    setActionTarget('Instagram');
    setBuilderMode('SIMPLE');
    setConditions([emptyCondition()]);
    setTestResult(null);
    setTestError(null);
    setUseGroupedMode(false);
    setGroupTree(emptyGroup('AND'));
    setCooldownMinutes('0');
    setSelectedChannels(['IN_APP']);
  };

  const updateCondition = (idx: number, patch: Partial<AutomationCondition>) => {
    setConditions((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const addConditionRow = () => setConditions((prev) => [...prev, emptyCondition()]);

  const removeConditionRow = (idx: number) =>
    setConditions((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const handleTestDraft = async () => {
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      const draft =
        builderMode === 'SIMPLE'
          ? {
              name: name.trim() || 'Untitled Rule',
              triggerType,
              conditionOperator: 'GREATER_THAN',
              thresholdValue,
              actionType,
              actionTarget,
              conditionLogic: 'SINGLE',
            }
          : {
              name: name.trim() || 'Untitled Rule',
              actionType,
              actionTarget,
              conditionLogic: 'ALL',
              conditions: conditions.filter((c) => c.triggerType && c.thresholdValue).map((c, idx) => ({ ...c, orderIndex: idx })),
            };
      const res = await automationV5Api.testDraftRule(draft);
      setTestResult(res);
    } catch (err: any) {
      setTestError(err.message || 'Failed to test draft rule.');
    } finally {
      setTesting(false);
    }
  };

  const handleTestSavedRule = async (ruleId: string) => {
    setTestingRuleId(ruleId);
    try {
      const res = await automationV5Api.testRule(ruleId);
      setRuleTestResults((prev) => ({ ...prev, [ruleId]: res }));
    } catch (err: any) {
      alert(`Test rule failed: ${err.message}`);
    } finally {
      setTestingRuleId(null);
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

      {/* V5.1: Template Gallery */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-cyan-400" /> Rule Templates
          </h3>
          <span className="text-xs text-slate-500">One-click starting points for common policies</span>
        </div>
        {templatesLoading ? (
          <div className="text-center py-6 text-slate-500 text-xs">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">No rule templates available yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((tpl) => (
              <div key={tpl.key} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-white">{tpl.name}</p>
                  {tpl.category && (
                    <span className="text-[9px] uppercase font-bold text-cyan-400">{tpl.category}</span>
                  )}
                  {tpl.description && <p className="text-[11px] text-slate-400 mt-1">{tpl.description}</p>}
                </div>
                <button
                  onClick={() => handleUseTemplate(tpl.key)}
                  disabled={instantiatingKey === tpl.key}
                  className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition disabled:opacity-50"
                >
                  {instantiatingKey === tpl.key ? 'Adding...' : 'Use This Template'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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

                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-bold text-white">{rule.name}</h4>
                  {rule.conditionLogic === 'ALL' && rule.conditions && rule.conditions.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      Advanced &middot; AND chain
                    </span>
                  )}
                </div>

                {/* IF - THEN visual pill */}
                <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                  {rule.conditionLogic === 'ALL' && rule.conditions && rule.conditions.length > 0 ? (
                    rule.conditions.map((c, i) => (
                      <React.Fragment key={c.id || i}>
                        {i > 0 && (
                          <div className="text-[10px] font-bold text-indigo-400 uppercase pl-1">AND</div>
                        )}
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-indigo-400 uppercase text-[10px] mt-0.5">IF</span>
                          <span className="text-slate-300">
                            {c.triggerType.replace(/_/g, ' ')} {c.conditionOperator.replace(/_/g, ' ').toLowerCase()}{' '}
                            <strong className="text-white">{c.thresholdValue}</strong>
                            {c.timeWindowStart && c.timeWindowEnd && (
                              <span className="text-slate-500"> ({c.timeWindowStart}–{c.timeWindowEnd})</span>
                            )}
                          </span>
                        </div>
                      </React.Fragment>
                    ))
                  ) : (
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-indigo-400 uppercase text-[10px] mt-0.5">IF</span>
                      <span className="text-slate-300">
                        {rule.triggerType.replace(/_/g, ' ')} &gt;{' '}
                        <strong className="text-white">{rule.thresholdValue} min</strong>
                      </span>
                    </div>
                  )}
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

                {(rule as any).cooldownMinutes > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1.5">
                    <Timer className="w-3 h-3" /> Cooldown: {(rule as any).cooldownMinutes}m
                  </div>
                )}

                <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                  {DELIVERY_CHANNELS.map((ch) => {
                    const active = ((rule as any).deliveryChannels || ['IN_APP']).includes(ch.key);
                    if (!active) return null;
                    const Icon = ch.icon;
                    return (
                      <span
                        key={ch.key}
                        title={ch.configured ? `${ch.label} — configured` : `${ch.label} — not configured`}
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                          ch.configured
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {ch.label}
                        {!ch.configured && ' · Not configured'}
                      </span>
                    );
                  })}
                </div>

                {ruleTestResults[rule.id] && (
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                    <div className={`text-[11px] font-bold flex items-center gap-1.5 ${ruleTestResults[rule.id].wouldTrigger ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {ruleTestResults[rule.id].wouldTrigger ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {ruleTestResults[rule.id].wouldTrigger ? 'Would trigger' : 'Would not trigger'}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ruleTestResults[rule.id].conditionResults?.map((cr, i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            cr.passed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                          }`}
                        >
                          {cr.actualValue} / {cr.threshold} {cr.passed ? 'PASS' : 'FAIL'}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">{ruleTestResults[rule.id].explanation}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between gap-2">
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

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTestSavedRule(rule.id)}
                    disabled={testingRuleId === rule.id}
                    className="p-1.5 text-slate-500 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
                    title="Test rule (dry-run)"
                  >
                    <FlaskConical className={`w-4 h-4 ${testingRuleId === rule.id ? 'animate-pulse' : ''}`} />
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`bg-slate-900 border border-slate-800 rounded-2xl w-full p-6 shadow-2xl my-8 ${builderMode === 'ADVANCED' ? 'max-w-xl' : 'max-w-md'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Create Automation Rule</h3>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setBuilderMode('SIMPLE')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    builderMode === 'SIMPLE' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Simple
                </button>
                <button
                  type="button"
                  onClick={() => setBuilderMode('ADVANCED')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1 ${
                    builderMode === 'ADVANCED' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3 h-3" /> Advanced
                </button>
              </div>
            </div>

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

              {builderMode === 'SIMPLE' ? (
                <>
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
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300">
                      {useGroupedMode ? 'Nested AND/OR Condition Groups' : 'Conditions (all must pass — AND chain)'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseGroupedMode((v) => !v)}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                    >
                      {useGroupedMode ? 'Switch to flat AND chain' : 'Switch to nested groups'}
                    </button>
                  </div>

                  {useGroupedMode && <ConditionGroupBuilder tree={groupTree} onChange={setGroupTree} />}

                  {!useGroupedMode && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={addConditionRow}
                      className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Condition
                    </button>
                  </div>
                  )}

                  {!useGroupedMode && conditions.map((cond, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      {idx > 0 && (
                        <div className="text-[10px] font-bold text-indigo-400 uppercase">AND</div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={cond.triggerType}
                          onChange={(e) => updateCondition(idx, { triggerType: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          {ADVANCED_TRIGGER_TYPES.map((t) => (
                            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                        <select
                          value={cond.conditionOperator}
                          onChange={(e) => updateCondition(idx, { conditionOperator: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          {ADVANCED_OPERATORS.map((op) => (
                            <option key={op} value={op}>{op.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Threshold"
                          value={cond.thresholdValue}
                          onChange={(e) => updateCondition(idx, { thresholdValue: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                        <input
                          type="text"
                          placeholder="Scope (optional, e.g. Instagram)"
                          value={cond.scopeValue || ''}
                          onChange={(e) => updateCondition(idx, { scopeValue: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={cond.timeWindowStart || ''}
                            onChange={(e) => updateCondition(idx, { timeWindowStart: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                          <span className="text-[10px] text-slate-500">to</span>
                          <input
                            type="time"
                            value={cond.timeWindowEnd || ''}
                            onChange={(e) => updateCondition(idx, { timeWindowEnd: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeConditionRow(idx)}
                          disabled={conditions.length === 1}
                          className="text-[11px] text-slate-500 hover:text-rose-400 disabled:opacity-30 flex items-center justify-end gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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

              {/* V5.1: cooldown */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-cyan-400" /> Cooldown (minutes between live triggers)
                </label>
                <input
                  type="number"
                  min={0}
                  value={cooldownMinutes}
                  onChange={(e) => setCooldownMinutes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* V5.1: delivery channels */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Delivery Channels</label>
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_CHANNELS.map((ch) => {
                    const Icon = ch.icon;
                    const active = selectedChannels.includes(ch.key);
                    return (
                      <button
                        type="button"
                        key={ch.key}
                        onClick={() => toggleChannel(ch.key, ch.configured)}
                        disabled={!ch.configured}
                        title={ch.configured ? ch.label : `${ch.label} — not configured`}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                          !ch.configured
                            ? 'bg-slate-950/40 text-slate-600 border-slate-800 cursor-not-allowed'
                            : active
                            ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {ch.label}
                        {!ch.configured && ' (Not configured)'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Test Rule (dry-run, no save, no action execution) */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleTestDraft}
                  disabled={testing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-medium text-xs transition disabled:opacity-50"
                >
                  <FlaskConical className={`w-3.5 h-3.5 text-cyan-400 ${testing ? 'animate-pulse' : ''}`} />
                  {testing ? 'Testing...' : 'Test Rule'}
                </button>

                {testError && (
                  <p className="mt-2 text-[11px] text-rose-400">{testError}</p>
                )}

                {testResult && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className={`text-xs font-bold flex items-center gap-1.5 ${testResult.wouldTrigger ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {testResult.wouldTrigger ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {testResult.wouldTrigger ? 'Would trigger' : 'Would not trigger'}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {testResult.conditionResults?.map((cr, i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                            cr.passed
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {cr.actualValue} vs {cr.threshold} — {cr.passed ? 'PASS' : 'FAIL'}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">{testResult.explanation}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowAddModal(false);
                  }}
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
