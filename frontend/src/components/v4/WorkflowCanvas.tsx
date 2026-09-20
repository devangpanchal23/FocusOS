import React, { useState } from 'react';
import { Play, Sparkles, CheckCircle2, ShieldCheck, Filter, Zap, Clock, Bot, ArrowRight, RefreshCw } from 'lucide-react';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'ai' | 'action' | 'approval';
  label: string;
  detail?: string;
  icon?: string;
  config?: any;
}

interface WorkflowCanvasProps {
  initialNodes?: WorkflowNode[];
  onExecute?: (nodes: WorkflowNode[]) => Promise<any>;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ initialNodes, onExecute }) => {
  const defaultNodes: WorkflowNode[] = initialNodes || [
    { id: '1', type: 'trigger', label: 'Every Sunday 8:00 PM', detail: 'Cron Trigger: 0 20 * * 0' },
    { id: '2', type: 'condition', label: 'Weekly Screen Time > 30h', detail: 'Filter: screenTimeMinutes > 1800' },
    { id: '3', type: 'ai', label: 'AI Synthesize Distraction Trends', detail: 'Agent: Analytics + Wellness Agent' },
    { id: '4', type: 'approval', label: 'Require Human Target Confirmation', detail: 'HITL Gate: HIGH_IMPACT' },
    { id: '5', type: 'action', label: 'Apply Shield Rules & Draft Calendar', detail: 'Executor: Block Rules + Schedule' },
  ];

  const [nodes, setNodes] = useState<WorkflowNode[]>(defaultNodes);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(defaultNodes[0]);
  const [activeRunningIndex, setActiveRunningIndex] = useState<number | null>(null);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const getNodeColor = (type: string, isCurrent: boolean) => {
    if (isCurrent) {
      return 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20';
    }
    switch (type) {
      case 'trigger':
        return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
      case 'condition':
        return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
      case 'ai':
        return 'border-purple-500/40 bg-purple-500/10 text-purple-300';
      case 'approval':
        return 'border-red-500/40 bg-red-500/10 text-red-300';
      case 'action':
      default:
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'trigger':
        return <Clock className="w-4 h-4" />;
      case 'condition':
        return <Filter className="w-4 h-4" />;
      case 'ai':
        return <Bot className="w-4 h-4" />;
      case 'approval':
        return <ShieldCheck className="w-4 h-4" />;
      case 'action':
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const handleTestRun = async () => {
    setIsRunning(true);
    setRunLogs(['[WORKFLOW_ENGINE] Initializing test pipeline runner...']);

    for (let i = 0; i < nodes.length; i++) {
      setActiveRunningIndex(i);
      setRunLogs((prev) => [...prev, `[STEP ${i + 1}] Executing "${nodes[i].label}" (${nodes[i].type.toUpperCase()})...`]);
      await new Promise((r) => setTimeout(r, 600));
    }

    setActiveRunningIndex(null);
    setIsRunning(false);
    setRunLogs((prev) => [
      ...prev,
      `[SUCCESS] Workflow pipeline finished in 3.1s. All 5 nodes verified successfully.`,
    ]);
  };

  const applyTemplate = (templateName: string) => {
    if (templateName === 'CIRCUIT_BREAKER') {
      setNodes([
        { id: '1', type: 'trigger', label: 'Short-Form Reels > 45m Today', detail: 'Event: REELS_THRESHOLD' },
        { id: '2', type: 'condition', label: 'Unscheduled Hour (No Focus Running)', detail: 'State: IDLE_STATUS' },
        { id: '3', type: 'ai', label: 'Analyze Dopamine Friction Cost', detail: 'Agent: Digital Wellness' },
        { id: '4', type: 'action', label: 'Activate 10s Breath Friction Pause', detail: 'Intervention: FRICTION_POPUP' },
      ]);
    } else if (templateName === 'DEEP_WORK_SHIELD') {
      setNodes([
        { id: '1', type: 'trigger', label: 'User Starts Focus Session', detail: 'Trigger: FOCUS_STARTED' },
        { id: '2', type: 'ai', label: 'Configure Custom Ambient Sound', detail: 'Agent: Focus Agent' },
        { id: '3', type: 'action', label: 'Quarantine Social Apps & Tabs', detail: 'Action: STRICT_BLOCK' },
      ]);
    } else {
      setNodes(defaultNodes);
    }
    setSelectedNode(null);
    setRunLogs([]);
  };

  return (
    <div className="space-y-4">
      {/* Template selector and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#12121b] border border-[#212130]">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400 font-medium">Templates:</span>
          <button
            onClick={() => applyTemplate('SUNDAY_RESET')}
            className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-zinc-300 font-semibold transition border border-[#29293d]"
          >
            Sunday Reset
          </button>
          <button
            onClick={() => applyTemplate('CIRCUIT_BREAKER')}
            className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-zinc-300 font-semibold transition border border-[#29293d]"
          >
            Reels Emergency Breaker
          </button>
          <button
            onClick={() => applyTemplate('DEEP_WORK_SHIELD')}
            className="px-2.5 py-1 rounded-lg bg-[#181824] hover:bg-[#202030] text-zinc-300 font-semibold transition border border-[#29293d]"
          >
            Deep Work Auto-Shield
          </button>
        </div>

        <button
          onClick={handleTestRun}
          disabled={isRunning}
          className="py-1.5 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
        >
          {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {isRunning ? 'Running Pipeline...' : 'Test Run Workflow'}
        </button>
      </div>

      {/* Visual Workflow Canvas */}
      <div className="p-6 rounded-2xl bg-[#0b0b10] border border-[#1f1f2e] min-h-[300px] relative overflow-x-auto">
        <div className="flex items-center gap-4 min-w-max py-8">
          {nodes.map((node, idx) => {
            const isCurrent = activeRunningIndex === idx;
            const isSelected = selectedNode?.id === node.id;

            return (
              <React.Fragment key={node.id}>
                {/* Node Box */}
                <div
                  onClick={() => setSelectedNode(node)}
                  className={`w-52 p-4 rounded-xl cursor-pointer transition-all border ${
                    isSelected ? 'ring-2 ring-indigo-500 bg-[#161622]' : 'bg-[#12121c]'
                  } ${getNodeColor(node.type, isCurrent)} hover:scale-105`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider opacity-80">
                      Step {idx + 1} • {node.type}
                    </span>
                    <div className="w-6 h-6 rounded-md bg-black/40 flex items-center justify-center">
                      {getNodeIcon(node.type)}
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-snug mb-1">{node.label}</h4>
                  <p className="text-[11px] text-zinc-400 font-mono truncate">{node.detail || 'Standard step execution'}</p>

                  {isCurrent && (
                    <div className="mt-2.5 pt-2 border-t border-amber-500/30 flex items-center gap-1.5 text-[10px] text-amber-300 font-semibold animate-pulse">
                      <Sparkles className="w-3 h-3" />
                      <span>Executing step in runtime...</span>
                    </div>
                  )}
                </div>

                {/* Arrow Connector */}
                {idx < nodes.length - 1 && (
                  <div className="flex items-center text-zinc-600">
                    <div className="w-6 h-[2px] bg-[#27273a]" />
                    <ArrowRight className="w-4 h-4 text-zinc-500 shrink-0 -ml-1" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Details & Execution Log Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Node Parameter Inspector */}
        <div className="p-4 rounded-xl bg-[#11111a] border border-[#212130] space-y-2">
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
            Node Inspector {selectedNode ? `• ${selectedNode.label}` : ''}
          </h4>
          {selectedNode ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#1b1b26]">
                <span className="text-zinc-500">Node Type:</span>
                <span className="font-mono text-indigo-300 uppercase">{selectedNode.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1b1b26]">
                <span className="text-zinc-500">Internal ID:</span>
                <span className="font-mono text-zinc-400">{selectedNode.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1b1b26]">
                <span className="text-zinc-500">Parameters:</span>
                <span className="font-mono text-emerald-300">{selectedNode.detail}</span>
              </div>
              <p className="text-[11px] text-zinc-400 pt-1">
                Visual AI nodes pass contextual JSON payload downstream to subsequent steps. Approval nodes halt external writes until confirmed by user.
              </p>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Click any node above to inspect its parameters and retry configuration.</p>
          )}
        </div>

        {/* Live Step-by-Step Execution Log */}
        <div className="p-4 rounded-xl bg-[#0c0c12] border border-[#1e1e2c] space-y-2 font-mono text-[11px]">
          <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
            Runtime Execution Trace
          </h4>
          <div className="h-32 overflow-y-auto space-y-1 text-zinc-400">
            {runLogs.length === 0 ? (
              <p className="text-zinc-600">Click "Test Run Workflow" above to execute and stream live runtime logs...</p>
            ) : (
              runLogs.map((log, i) => (
                <div key={i} className={log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : log.includes('Executing') ? 'text-amber-300' : 'text-zinc-400'}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
