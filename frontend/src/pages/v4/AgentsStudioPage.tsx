import React, { useState, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Zap,
  Target,
  Calendar,
  BarChart3,
  Cpu,
  ShieldCheck,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { v4Api } from '../../services/v4.service';
import { ApprovalDrawer } from '../../components/v4/ApprovalDrawer';

export const AgentsStudioPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [agentLogs, setAgentLogs] = useState<any[]>([]);
  const [isApprovalDrawerOpen, setIsApprovalDrawerOpen] = useState(false);

  const agents = [
    {
      id: 'ProductivityAgent',
      name: 'Productivity Agent',
      icon: Target,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      description: 'Productivity analysis, daily output, and goal alignment',
    },
    {
      id: 'FocusAgent',
      name: 'Focus Agent',
      icon: Zap,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'Focus-session optimization, block rules & distraction shielding',
    },
    {
      id: 'DigitalWellnessAgent',
      name: 'Digital Wellness Agent',
      icon: ShieldCheck,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      description: 'Screen-time balance, short-form curb, and digital sunset',
    },
    {
      id: 'PlanningAgent',
      name: 'Planning Agent',
      icon: Calendar,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      description: 'Calendar analysis, workload balance, and agenda construction',
    },
    {
      id: 'AnalyticsAgent',
      name: 'Analytics Agent',
      icon: BarChart3,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      description: 'Historical trend analysis, anomaly detection, and correlations',
    },
    {
      id: 'AutomationAgent',
      name: 'Automation Agent',
      icon: Cpu,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      description: 'Repetitive workflow detection and proactive automation',
    },
  ];

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const logs = await v4Api.getAgentLogs();
      setAgentLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunOrchestrator = async (customQuery?: string) => {
    const q = customQuery || query;
    if (!q.trim()) return;
    setIsOrchestrating(true);
    setResult(null);
    try {
      const res = await v4Api.orchestrate(q);
      setResult(res);
      await loadLogs();
    } catch (e: any) {
      alert(`Orchestration error: ${e.message}`);
    } finally {
      setIsOrchestrating(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              PHASE 1–3 ARCHITECTURE
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400">Autonomous Multi-Agent Swarm</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Autonomous AI Agent Studio
          </h1>
          <p className="text-sm text-zinc-400">
            A central orchestration layer delegating complex productivity goals across specialized autonomous agents.
          </p>
        </div>

        <button
          onClick={() => setIsApprovalDrawerOpen(true)}
          className="py-2 px-3.5 rounded-xl bg-[#181826] hover:bg-[#202032] text-zinc-300 border border-[#2b2b3e] text-xs font-semibold flex items-center gap-2 transition"
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          Human-in-the-Loop Queue
        </button>
      </div>

      {/* 6 Specialized Agents Swarm Roster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const isInvoked = result?.delegatedAgents?.includes(agent.id);

          return (
            <div
              key={agent.id}
              className={`p-4 rounded-2xl border transition-all ${
                isInvoked
                  ? 'bg-[#181828] border-indigo-500/50 ring-2 ring-indigo-500/30 shadow-lg'
                  : 'bg-[#101017] border-[#222232] hover:border-[#2f2f44]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${agent.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isInvoked && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 animate-pulse">
                    INVOKED
                  </span>
                )}
              </div>
              <h3 className="text-xs font-bold text-white mb-1">{agent.name}</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{agent.description}</p>
            </div>
          );
        })}
      </div>

      {/* Interactive Orchestrator Input Bar */}
      <div className="p-6 rounded-3xl bg-[#12121b] border border-[#242436] shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Orchestration Prompt & Natural Language Coordination</span>
        </div>

        <div className="flex items-center gap-3 bg-[#0c0c12] border border-[#20202e] rounded-2xl p-2.5 shadow-inner">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunOrchestrator()}
            placeholder="e.g., 'I need to study for 3 hours tomorrow and I have two meetings.'"
            className="flex-1 bg-transparent px-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button
            onClick={() => handleRunOrchestrator()}
            disabled={isOrchestrating || !query.trim()}
            className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition disabled:opacity-50"
          >
            {isOrchestrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isOrchestrating ? 'Orchestrating Swarm...' : 'Orchestrate'}
          </button>
        </div>

        {/* Sample Prompt Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-zinc-500">Sample Inquiries:</span>
          {[
            'I need to study for 3 hours tomorrow and I have two meetings.',
            'Analyze my top short-form distraction trends today',
            'Suggest automations for my coding sessions',
          ].map((promptText, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(promptText);
                handleRunOrchestrator(promptText);
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#191926] hover:bg-[#222234] text-zinc-400 hover:text-zinc-200 border border-[#29293e] transition"
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>

      {/* Orchestration Trace Output */}
      {result && (
        <div className="p-6 rounded-3xl bg-[#101018] border border-[#26263a] shadow-2xl space-y-6 animate-fadeIn">
          {/* Swarm Decomposition Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1f1f2e]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Unified Orchestrator Synthesis
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {result.executionMs}ms • {result.tokensEstimated} tokens
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Intent: {result.intentDetected} • Delegated: {result.delegatedAgents.join(', ')}
                </p>
              </div>
            </div>

            {result.requiresApproval && (
              <button
                onClick={() => setIsApprovalDrawerOpen(true)}
                className="py-1.5 px-3.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Review Proposed High-Impact Action
              </button>
            )}
          </div>

          {/* Consolidated Answer */}
          <div className="p-4 rounded-xl bg-[#141420] border border-[#232336] text-xs text-zinc-200 leading-relaxed">
            {result.consolidatedAnswer}
          </div>

          {/* Sub-Agent Detailed Findings Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Specialized Sub-Agent Evidence & Proposals
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.agentResults.map((agentRes: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-[#12121b] border border-[#212130] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-100">{agentRes.agentName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[150px]">{agentRes.role}</span>
                  </div>

                  <p className="text-xs text-zinc-400">{agentRes.summary}</p>

                  <div className="space-y-1 pt-1">
                    {agentRes.groundedFindings.map((finding: string, fIdx: number) => (
                      <div key={fIdx} className="flex items-start gap-1.5 text-[11px] text-zinc-400">
                        <CheckCircle2 className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{finding}</span>
                      </div>
                    ))}
                  </div>

                  {agentRes.suggestedAction && (
                    <div className="mt-2 pt-2 border-t border-[#1f1f2e] flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 font-mono">Proposed Action:</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        agentRes.suggestedAction.riskLevel === 'HIGH_IMPACT'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {agentRes.suggestedAction.label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Historical Agent Execution Logs */}
      <div className="p-6 rounded-3xl bg-[#101018] border border-[#212132] space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
              Agent Orchestration Audit Trail
            </h3>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">{agentLogs.length} Records</span>
        </div>

        <div className="divide-y divide-[#1b1b28] max-h-60 overflow-y-auto">
          {agentLogs.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">No historical logs recorded yet.</p>
          ) : (
            agentLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-4">
                  <p className="text-zinc-200 font-medium truncate">{log.userQuery}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {log.intentDetected} • {log.executionMs}ms • {new Date(log.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono shrink-0">
                  {log.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <ApprovalDrawer
        isOpen={isApprovalDrawerOpen}
        onClose={() => setIsApprovalDrawerOpen(false)}
      />
    </div>
  );
};
