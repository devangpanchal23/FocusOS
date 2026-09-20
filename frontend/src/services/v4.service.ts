import { getAuthToken } from './api.js';

const API_BASE = '/api/v4';

function getAuthHeader(): Record<string, string> {
  const token = getAuthToken() || localStorage.getItem('focus_auth_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const v4Api = {
  // 1. Multi-Agent Orchestrator
  async orchestrate(query: string) {
    const res = await fetch(`${API_BASE}/orchestrator/query`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getAgentLogs() {
    const res = await fetch(`${API_BASE}/orchestrator/logs`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // 2. Human-In-The-Loop Approval Pipeline
  async getPendingApprovals() {
    const res = await fetch(`${API_BASE}/approvals/pending`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getApprovalHistory() {
    const res = await fetch(`${API_BASE}/approvals/history`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async reviewApproval(id: string, decision: 'APPROVED' | 'REJECTED') {
    const res = await fetch(`${API_BASE}/approvals/${id}/review`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ decision }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // 3. AI Workflows
  async getWorkflows() {
    const res = await fetch(`${API_BASE}/workflows`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createWorkflow(data: any) {
    const res = await fetch(`${API_BASE}/workflows`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateWorkflow(id: string, data: any) {
    const res = await fetch(`${API_BASE}/workflows/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteWorkflow(id: string) {
    const res = await fetch(`${API_BASE}/workflows/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async executeWorkflow(id: string) {
    const res = await fetch(`${API_BASE}/workflows/${id}/execute`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // 4. Personal Context & Knowledge
  async getContext() {
    const res = await fetch(`${API_BASE}/context`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async upsertContext(data: any) {
    const res = await fetch(`${API_BASE}/context`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteContext(key: string) {
    const res = await fetch(`${API_BASE}/context/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getKnowledgeItems(category?: string, query?: string) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (query) params.append('query', query);
    const res = await fetch(`${API_BASE}/knowledge?${params.toString()}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async createKnowledgeItem(data: any) {
    const res = await fetch(`${API_BASE}/knowledge`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteKnowledgeItem(id: string) {
    const res = await fetch(`${API_BASE}/knowledge/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // 5. Universal Search
  async universalSearch(query: string) {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // 6. Behavioral Intelligence & Scenario Simulation
  async getCorrelations() {
    const res = await fetch(`${API_BASE}/behavioral/correlations`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async runSimulation(params: { deltaSocialMinutes: number; extraStudyHours: number; shiftFocusHour?: number }) {
    const res = await fetch(`${API_BASE}/simulations/run`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async saveSimulation(data: any) {
    const res = await fetch(`${API_BASE}/simulations/save`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getSavedSimulations() {
    const res = await fetch(`${API_BASE}/simulations/saved`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getAdaptiveModel() {
    const res = await fetch(`${API_BASE}/adaptive-model`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateAdaptiveModel(updates: any) {
    const res = await fetch(`${API_BASE}/adaptive-model`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async resetAdaptiveModel() {
    const res = await fetch(`${API_BASE}/adaptive-model/reset`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // 7. Coaching & Reflections
  async getCoachingStatus() {
    const res = await fetch(`${API_BASE}/coaching/status`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async proposeRevisedPlan(goalId: string) {
    const res = await fetch(`${API_BASE}/coaching/goals/${goalId}/revise`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getReflections(periodType?: string) {
    const url = periodType ? `${API_BASE}/reflections?periodType=${periodType}` : `${API_BASE}/reflections`;
    const res = await fetch(url, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async submitReflection(data: any) {
    const res = await fetch(`${API_BASE}/reflections`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // 8. Devices, Integrations & Marketplace
  async getDevices() {
    const res = await fetch(`${API_BASE}/devices`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async triggerDeviceSync(id: string) {
    const res = await fetch(`${API_BASE}/devices/${id}/sync`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getIntegrations() {
    const res = await fetch(`${API_BASE}/integrations`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async toggleIntegration(provider: string, isConnected: boolean) {
    const res = await fetch(`${API_BASE}/integrations/${provider}/toggle`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ isConnected }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async syncIntegration(provider: string) {
    const res = await fetch(`${API_BASE}/integrations/${provider}/sync`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getMarketplaceCatalog(category?: string, query?: string) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (query) params.append('query', query);
    const res = await fetch(`${API_BASE}/marketplace?${params.toString()}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async installMarketplaceApp(slug: string) {
    const res = await fetch(`${API_BASE}/marketplace/${slug}/install`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async installApp(slug: string) {
    return this.installMarketplaceApp(slug);
  },

  async uninstallMarketplaceApp(slug: string) {
    const res = await fetch(`${API_BASE}/marketplace/${slug}/uninstall`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async uninstallApp(slug: string) {
    return this.uninstallMarketplaceApp(slug);
  },

  async evaluateSandbox(code: string, permissions: string[]) {
    const res = await fetch(`${API_BASE}/sandbox/evaluate`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ code, permissions }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // 9. SaaS & Enterprise
  async getSubscription() {
    const res = await fetch(`${API_BASE}/billing/subscription`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async changePlan(planName: string) {
    const res = await fetch(`${API_BASE}/billing/change-plan`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ planName }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getEnterpriseOverview() {
    const res = await fetch(`${API_BASE}/enterprise/overview`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getGovernanceAudit() {
    const res = await fetch(`${API_BASE}/governance/audit`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getAiMemories() {
    const res = await fetch(`${API_BASE}/governance/memories`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async forgetAiMemory(id: string) {
    const res = await fetch(`${API_BASE}/governance/memories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // 10. Observability & Chaos
  async getApmMetrics() {
    const res = await fetch(`${API_BASE}/observability/apm`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async simulateChaos(scenario: string) {
    const res = await fetch(`${API_BASE}/observability/chaos`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ scenario }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getGlobalRegions() {
    const res = await fetch(`${API_BASE}/observability/regions`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getFeatureFlags() {
    const res = await fetch(`${API_BASE}/feature-flags`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async toggleFeatureFlag(flagKey: string, isEnabled: boolean) {
    const res = await fetch(`${API_BASE}/feature-flags/${flagKey}/toggle`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ isEnabled }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
