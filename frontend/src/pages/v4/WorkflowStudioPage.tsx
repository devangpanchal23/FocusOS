import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Play, CheckCircle2, AlertCircle, RefreshCw, Trash2, Clock, Sparkles } from 'lucide-react';
import { v4Api } from '../../services/v4.service';
import { WorkflowCanvas } from '../../components/v4/WorkflowCanvas';

export const WorkflowStudioPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setIsLoading(true);
    try {
      const data = await v4Api.getWorkflows();
      setWorkflows(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async (id: string) => {
    setExecutingId(id);
    try {
      const res = await v4Api.executeWorkflow(id);
      alert(`Workflow executed successfully! Status: ${res.status} in ${res.durationMs}ms`);
      await loadWorkflows();
    } catch (e: any) {
      alert(`Execution failed: ${e.message}`);
    } finally {
      setExecutingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await v4Api.deleteWorkflow(id);
      await loadWorkflows();
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
              PHASE 4–5 ENGINE
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400">Visual No-Code Builder</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Visual AI Workflow Studio
          </h1>
          <p className="text-sm text-zinc-400">
            Design, inspect, and automate multi-step intelligence flows: Trigger → Condition → AI Reasoning → Action → Human Approval.
          </p>
        </div>

        <button
          onClick={loadWorkflows}
          className="py-2 px-3.5 rounded-xl bg-[#181826] hover:bg-[#202032] text-zinc-300 border border-[#2b2b3e] text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Reload Workflows
        </button>
      </div>

      {/* Visual Canvas Builder */}
      <div className="p-6 rounded-3xl bg-[#101018] border border-[#222234] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white font-['Outfit']">Interactive Visual Canvas</h3>
          </div>
          <span className="text-xs text-zinc-500">Live Drag-and-Drop Node Graph</span>
        </div>

        <WorkflowCanvas />
      </div>

      {/* Saved Workflows Table / Grid */}
      <div className="p-6 rounded-3xl bg-[#101018] border border-[#212132] space-y-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Active Production Workflows ({workflows.length})
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((wf) => (
            <div key={wf.id} className="p-5 rounded-2xl bg-[#141420] border border-[#232336] space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    {wf.triggerType}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {wf.runCount} Runs • Last: {wf.lastRunStatus || 'NONE'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{wf.name}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{wf.description}</p>
              </div>

              <div className="pt-2 border-t border-[#1f1f2e] flex items-center justify-between gap-2">
                <button
                  disabled={executingId === wf.id}
                  onClick={() => handleExecute(wf.id)}
                  className="py-1.5 px-3.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  {executingId === wf.id ? 'Running...' : 'Execute Now'}
                </button>

                <button
                  onClick={() => handleDelete(wf.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                  title="Delete Workflow"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
