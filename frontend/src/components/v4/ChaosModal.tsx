import React, { useState } from 'react';
import { Flame, ShieldCheck, RefreshCw, X, AlertOctagon, CheckCircle2, Zap } from 'lucide-react';
import { v4Api } from '../../services/v4.service';

interface ChaosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChaosModal: React.FC<ChaosModalProps> = ({ isOpen, onClose }) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('AI_PROVIDER_DOWN');
  const [result, setResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const scenarios = [
    {
      id: 'AI_PROVIDER_DOWN',
      title: 'Upstream AI Provider Outage',
      desc: 'Simulate Gemini LLM 503 outage. Tests automatic failover to local deterministic heuristics.',
    },
    {
      id: 'DB_LATENCY',
      title: 'Database Spike & Latency',
      desc: 'Inject 850ms database response delay. Tests in-memory telemetry L1 cache fallback.',
    },
    {
      id: 'QUEUE_BACKPRESSURE',
      title: 'Sync Queue Backpressure Spike',
      desc: 'Inject 5,000 rapid event telemetry updates. Tests debounce and idempotency deduplication.',
    },
    {
      id: 'NETWORK_PARTITION',
      title: 'Client Offline Network Partition',
      desc: 'Simulate offline disconnected state. Tests local queue buffering and auto-reconciliation.',
    },
  ];

  const handleRunChaos = async () => {
    setIsSimulating(true);
    setResult(null);
    try {
      const res = await v4Api.simulateChaos(selectedScenario);
      setResult(res);
    } catch (e: any) {
      alert(`Simulation failed: ${e.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-[#111119] border border-[#272738] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-[#141420] border-b border-[#242436] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Chaos & Resilience Simulator</h3>
              <p className="text-[11px] text-zinc-400">Intentionally test system fault tolerance and graceful degradation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-300">Select Failure Scenario to Inject:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {scenarios.map((sc) => (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenario(sc.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedScenario === sc.id
                      ? 'bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/30'
                      : 'bg-[#151520] border-[#222232] hover:bg-[#1a1a28]'
                  }`}
                >
                  <p className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                    {sc.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 leading-snug">{sc.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleRunChaos}
            disabled={isSimulating}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
          >
            {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {isSimulating ? 'Injecting Fault & Evaluating Fallback...' : 'Inject Chaos Scenario'}
          </button>

          {/* Simulation Output Card */}
          {result && (
            <div className="p-4 rounded-xl bg-[#0d0d14] border border-[#232336] space-y-2 font-mono text-xs animate-fadeIn">
              <div className="flex items-center justify-between pb-1 border-b border-[#1c1c2b]">
                <span className="text-zinc-400">Circuit Breaker:</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  {result.circuitBreakerState}
                </span>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-[#1c1c2b]">
                <span className="text-zinc-400">Fallback Strategy:</span>
                <span className="text-emerald-400 font-semibold">{result.fallbackStrategy}</span>
              </div>
              <div className="flex items-center justify-between pb-1 border-b border-[#1c1c2b]">
                <span className="text-zinc-400">Resilience Status:</span>
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {result.recoveryStatus} (Graceful Fallback)
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 pt-1 font-sans leading-relaxed">
                {result.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
