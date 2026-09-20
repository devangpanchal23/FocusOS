import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  ShieldAlert,
  Activity,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Download,
  Trash2,
  Cpu,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { v4Api } from '../../services/v4.service';
import { ChaosModal } from '../../components/v4/ChaosModal';

export const PlatformEnterprisePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BILLING' | 'ENTERPRISE' | 'GOVERNANCE' | 'OBSERVABILITY' | 'SANDBOX'>('BILLING');
  const [subData, setSubData] = useState<any>(null);
  const [enterprise, setEnterprise] = useState<any>(null);
  const [governanceLogs, setGovernanceLogs] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [apm, setApm] = useState<any>(null);
  const [isChaosOpen, setIsChaosOpen] = useState(false);

  // Sandbox state
  const [sandboxCode, setSandboxCode] = useState(`// Third-Party Sandboxed Plugin Sample
export function onFocusStart(session) {
  console.log("Session started: " + session.taskName);
  return { status: "ACTIVE_MONITORING" };
}`);
  const [sandboxResult, setSandboxResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [sub, ent, gov, mem, apmMetrics] = await Promise.all([
        v4Api.getSubscription(),
        v4Api.getEnterpriseOverview(),
        v4Api.getGovernanceAudit(),
        v4Api.getAiMemories(),
        v4Api.getApmMetrics(),
      ]);
      setSubData(sub);
      setEnterprise(ent);
      setGovernanceLogs(gov || []);
      setMemories(mem || []);
      setApm(apmMetrics);
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangePlan = async (planName: string) => {
    try {
      await v4Api.changePlan(planName);
      alert(`Subscription plan updated to ${planName}! Entitlements refreshed.`);
      await loadData();
    } catch (e: any) {
      alert(`Plan change error: ${e.message}`);
    }
  };

  const handleForgetMemory = async (id: string) => {
    try {
      await v4Api.forgetAiMemory(id);
      await loadData();
    } catch (e: any) {
      alert(`Error forgetting memory: ${e.message}`);
    }
  };

  const handleRunSandbox = async () => {
    try {
      const res = await v4Api.evaluateSandbox(sandboxCode, ['read:metrics', 'audio:playback']);
      setSandboxResult(res);
    } catch (e: any) {
      alert(`Sandbox execution error: ${e.message}`);
    }
  };

  const plans = [
    {
      name: 'FREE',
      price: 0,
      description: 'Core telemetry, daily metrics, and basic screen-time review',
      features: ['Basic screen-time tracking', 'V1 screenshot ingestion', 'Basic daily plan'],
    },
    {
      name: 'PRO',
      price: 12,
      description: 'Autonomous AI Multi-Agent swarm, visual workflows, and scenario simulation',
      features: ['6 Specialized AI Agents', 'Visual AI Workflow Builder', 'Scenario Simulation', 'Cross-Device Sync'],
    },
    {
      name: 'PREMIUM',
      price: 24,
      description: 'Advanced custom model weights, high-frequency telemetry, and premium binaural audio',
      features: ['Everything in Pro', 'Binaural flow audio packs', '100 Active Workflows', 'Priority AI Routing'],
    },
    {
      name: 'ENTERPRISE',
      price: 49,
      description: 'Organization management, SAML SSO, SCIM provisioning, and zero-trust audit',
      features: ['Everything in Premium', 'SAML SSO & SCIM', 'Custom Data Residency', 'Dedicated Support SLA'],
    },
  ];

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              PHASE 24–36 INFRASTRUCTURE
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400">SaaS, Enterprise & Observability</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Platform, SaaS & Enterprise Center
          </h1>
          <p className="text-sm text-zinc-400">
            Manage your SaaS tier entitlements, enterprise security policies, AI memory transparency, and infrastructure telemetry.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#14141f] border border-[#242436]">
          {(['BILLING', 'ENTERPRISE', 'GOVERNANCE', 'OBSERVABILITY', 'SANDBOX'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === tab
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 1. BILLING & SAAS MONETIZATION TAB */}
      {activeTab === 'BILLING' && (
        <div className="space-y-8">
          {/* Active Subscription Badge */}
          {subData && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#141424] to-[#11111a] border border-[#26263b] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">Active Tier Plan</span>
                <h3 className="text-2xl font-black text-white font-['Outfit'] mt-0.5">
                  FocusOS {subData.subscription?.planName}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Status: <span className="text-emerald-400 font-semibold">{subData.subscription?.status}</span> • Renews on {new Date(subData.subscription?.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black text-white font-['Outfit']">${subData.subscription?.monthlyPriceUsd}</span>
                <span className="text-xs text-zinc-500 font-mono"> / month</span>
              </div>
            </div>
          )}

          {/* Pricing Tier Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p) => {
              const isCurrent = subData?.subscription?.planName === p.name;
              return (
                <div
                  key={p.name}
                  className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                    isCurrent
                      ? 'bg-[#161626] border-indigo-500/50 ring-2 ring-indigo-500/30 shadow-xl'
                      : 'bg-[#101018] border-[#222232] hover:border-[#2f2f44]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200">{p.name}</span>
                      {isCurrent && (
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-white font-['Outfit']">
                      ${p.price} <span className="text-xs text-zinc-500 font-normal">/mo</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{p.description}</p>

                    <div className="space-y-1.5 pt-3 border-t border-[#1b1b28]">
                      {p.features.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    disabled={isCurrent}
                    onClick={() => handleChangePlan(p.name)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition ${
                      isCurrent
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : `Upgrade to ${p.name}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Billing Invoices Table */}
          {subData?.invoices?.length > 0 && (
            <div className="p-6 rounded-3xl bg-[#101018] border border-[#212132] space-y-4 shadow-md">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                Billing Invoice History ({subData.invoices.length})
              </h3>
              <div className="divide-y divide-[#1b1b28]">
                {subData.invoices.map((inv: any) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white font-mono">{inv.invoiceNumber}</span>
                      <span className="text-zinc-500 ml-3">{inv.planName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-zinc-200">${inv.amountUsd.toFixed(2)} USD</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        {inv.status}
                      </span>
                      <button
                        onClick={() => alert(`Downloading ${inv.invoiceNumber}.pdf`)}
                        className="p-1 rounded text-zinc-500 hover:text-indigo-400"
                        title="Download Invoice PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. ENTERPRISE TAB */}
      {activeTab === 'ENTERPRISE' && (
        <div className="space-y-6">
          {enterprise?.hasOrg ? (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-[#101018] border border-[#222234] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{enterprise.org.name}</h3>
                      <p className="text-xs text-zinc-400">Organization Slug: {enterprise.org.slug} • Your Role: {enterprise.org.userRole}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Enterprise License Active
                  </span>
                </div>
              </div>

              {/* Enterprise Policies */}
              <div className="p-6 rounded-3xl bg-[#101018] border border-[#212132] space-y-4">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  Organization Security & Compliance Policies
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {enterprise.org.policies.map((pol: any) => (
                    <div key={pol.id} className="p-4 rounded-2xl bg-[#141420] border border-[#232336] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-zinc-200">{pol.policyKey}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                          {pol.enforcementLevel}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-[#0b0b10] text-[10px] font-mono text-emerald-400">
                        {JSON.stringify(pol.policyValue)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <Building2 className="w-10 h-10 mx-auto text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-300">No Enterprise Organization Linked</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">Upgrade to the Enterprise Tier to invite team members, enforce SSO/SCIM, and configure organization-wide focus policies.</p>
            </div>
          )}
        </div>
      )}

      {/* 3. AI GOVERNANCE & MEMORY TRANSPARENCY TAB */}
      {activeTab === 'GOVERNANCE' && (
        <div className="space-y-6">
          {/* Memory Transparency Card */}
          <div className="p-6 rounded-3xl bg-[#101018] border border-[#212132] space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white font-['Outfit']">
                  AI Memory Transparency Inspector
                </h3>
                <p className="text-xs text-zinc-400">
                  Inspect exactly what the AI remembers about your habits, routines, and goals. You retain full right to erase.
                </p>
              </div>
              <span className="text-xs text-zinc-500 font-mono">{memories.length} Memories Stored</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memories.map((m) => (
                <div key={m.id} className="p-4 rounded-2xl bg-[#141420] border border-[#232336] space-y-2 text-xs flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-indigo-300 font-bold">{m.key}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                        {m.category}
                      </span>
                    </div>
                    <p className="text-zinc-200 font-medium">{m.value}</p>
                    {m.evidence && (
                      <p className="text-[11px] text-zinc-500 font-mono">Evidence: {m.evidence}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#1e1e2d] flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Confidence: {(m.confidence * 100).toFixed(0)}%</span>
                    <button
                      onClick={() => handleForgetMemory(m.id)}
                      className="text-zinc-500 hover:text-red-400 flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Forget Memory
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Governance Audit Trail */}
          <div className="p-6 rounded-3xl bg-[#101018] border border-[#212132] space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
              AI Safety & Governance Audit Logs ({governanceLogs.length})
            </h3>
            <div className="divide-y divide-[#1b1b28]">
              {governanceLogs.map((log) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <p className="text-zinc-200 font-medium">{log.promptSummary}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      Model: {log.modelRouted} • Latency: {log.latencyMs}ms • Cost: ${log.costUsd?.toFixed(5)} USD
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    {log.status} ({log.approvedBy})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. OBSERVABILITY & CHAOS TAB */}
      {activeTab === 'OBSERVABILITY' && (
        <div className="space-y-6">
          {apm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#101018] border border-[#212132] space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">API Latency (P95)</span>
                <div className="text-2xl font-bold text-white font-mono">{apm.performance.apiLatencyP95Ms}ms</div>
                <p className="text-[11px] text-emerald-400 font-semibold">P50: {apm.performance.apiLatencyP50Ms}ms</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#101018] border border-[#212132] space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Memory Heap Used</span>
                <div className="text-2xl font-bold text-indigo-300 font-mono">{apm.memory.heapUsedMb} MB</div>
                <p className="text-[11px] text-zinc-500">RSS: {apm.memory.rssMb} MB</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#101018] border border-[#212132] space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">AI Cost Savings</span>
                <div className="text-2xl font-bold text-emerald-400 font-mono">${apm.aiCostOptimization.costSavingsUsd}</div>
                <p className="text-[11px] text-zinc-500">Semantic cache hit: {(apm.aiCostOptimization.semanticCacheHitRatio * 100).toFixed(0)}%</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#101018] border border-[#212132] space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Model Router Split</span>
                <div className="text-sm font-bold text-white font-mono pt-1">
                  Flash: {apm.aiCostOptimization.modelRouting.lightweightFlashPercent}% • Pro: {apm.aiCostOptimization.modelRouting.heavyweightProPercent}%
                </div>
                <p className="text-[11px] text-zinc-500">Auto-routes by task complexity</p>
              </div>
            </div>
          )}

          {/* Chaos Simulator Trigger */}
          <div className="p-6 rounded-3xl bg-[#12121e] border border-rose-500/30 flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Chaos & Resilience Testing Suite</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Simulate database latency, AI provider downtime, and offline network partitions to verify graceful degradation.
              </p>
            </div>

            <button
              onClick={() => setIsChaosOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/20 transition"
            >
              <Flame className="w-4 h-4" />
              Launch Chaos Simulator
            </button>
          </div>
        </div>
      )}

      {/* 5. DEVELOPER SDK SANDBOX TAB */}
      {activeTab === 'SANDBOX' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#101018] border border-[#212132] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white font-['Outfit']">Developer Plugin Sandbox Runner</h3>
              </div>
              <span className="text-xs text-zinc-500 font-mono">Isolated V8 Runtime Simulation</span>
            </div>

            <p className="text-xs text-zinc-400">
              Third-party plugins run in an isolated sandbox with explicit permission restrictions. System primitives (`eval`, `require`, `fs`) are strictly quarantined.
            </p>

            <textarea
              value={sandboxCode}
              onChange={(e) => setSandboxCode(e.target.value)}
              rows={6}
              className="w-full bg-[#0b0b10] border border-[#1f1f2e] rounded-xl p-3 text-xs font-mono text-indigo-200 focus:outline-none focus:border-indigo-500"
            />

            <button
              onClick={handleRunSandbox}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-md"
            >
              <Zap className="w-4 h-4" />
              Run in Isolated Sandbox
            </button>

            {sandboxResult && (
              <div className="p-4 rounded-2xl bg-[#09090e] border border-[#1e1e2d] space-y-2 font-mono text-xs animate-fadeIn">
                <div className="flex items-center justify-between pb-1 border-b border-[#1a1a26]">
                  <span className="text-zinc-400">Status:</span>
                  <span className={`font-bold ${sandboxResult.status === 'EXECUTION_SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {sandboxResult.status}
                  </span>
                </div>
                {sandboxResult.output?.logs && (
                  <div className="space-y-1 text-[11px] text-zinc-400">
                    {sandboxResult.output.logs.map((l: string, i: number) => (
                      <div key={i}>{l}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <ChaosModal isOpen={isChaosOpen} onClose={() => setIsChaosOpen(false)} />
    </div>
  );
};
