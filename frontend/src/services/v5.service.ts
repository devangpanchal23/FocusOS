import { getAuthToken } from './api.js';

const API_BASE = '/api/v5';

function getAuthHeader(): Record<string, string> {
  const token = getAuthToken() || localStorage.getItem('focus_auth_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}: Request failed`);
  }
  return res.json();
}

export interface BrowserSummary {
  totalMinutes?: number;
  topDomain?: string;
  domainCount?: number;
  [key: string]: any;
}

export interface DomainAnalytics {
  domain: string;
  totalMinutes: number;
  sessionCount: number;
  isDistraction: boolean;
  category?: string;
}

export interface BrowserExclusionRule {
  id: string;
  domainPattern: string;
  reason?: string;
  isEnabled?: boolean;
}

export interface DomainCategoryRule {
  id: string;
  domainPattern: string;
  categoryId: string;
  isDistraction: boolean;
}

export interface TimelineEvent {
  id: string;
  sourceType: string;
  eventType: string;
  deviceName?: string;
  applicationName?: string;
  categoryName?: string;
  domain?: string;
  title?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  isDistraction: boolean;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  nextCursor?: string | null;
  totalDurationSeconds?: number;
}

export interface DaySummaryBucket {
  hour: number;
  totalMinutes: number;
  dominantCategory: string;
}

export interface TimeIntelligenceSummary {
  peakHours?: any[];
  todaysAnomalies?: any[];
  baselineCoverageDays?: number;
  [key: string]: any;
}

export const v5Api = {
  browser: {
    async getSummary(date?: string): Promise<BrowserSummary> {
      const qs = date ? `?date=${encodeURIComponent(date)}` : '';
      const res = await fetch(`${API_BASE}/browser/summary${qs}`, { headers: getAuthHeader() });
      return handle(res);
    },

    async getDomains(from?: string, to?: string): Promise<DomainAnalytics[]> {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const qs = params.toString();
      const res = await fetch(`${API_BASE}/browser/domains${qs ? `?${qs}` : ''}`, { headers: getAuthHeader() });
      return handle(res);
    },

    async getExclusions(): Promise<BrowserExclusionRule[]> {
      const res = await fetch(`${API_BASE}/browser/exclusions`, { headers: getAuthHeader() });
      return handle(res);
    },

    async upsertExclusion(data: { domainPattern: string; reason?: string }): Promise<BrowserExclusionRule> {
      const res = await fetch(`${API_BASE}/browser/exclusions`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      return handle(res);
    },

    async deleteExclusion(id: string): Promise<any> {
      const res = await fetch(`${API_BASE}/browser/exclusions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      return handle(res);
    },

    async getCategoryRules(): Promise<DomainCategoryRule[]> {
      const res = await fetch(`${API_BASE}/browser/category-rules`, { headers: getAuthHeader() });
      return handle(res);
    },

    async upsertCategoryRule(data: { domainPattern: string; categoryId: string; isDistraction: boolean }): Promise<DomainCategoryRule> {
      const res = await fetch(`${API_BASE}/browser/category-rules`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      return handle(res);
    },
  },

  timeline: {
    async getTimeline(params: {
      from?: string;
      to?: string;
      deviceIds?: string[];
      categoryIds?: string[];
      sourceTypes?: string[];
      cursor?: string;
      limit?: number;
    }): Promise<TimelineResponse> {
      const qs = new URLSearchParams();
      if (params.from) qs.append('from', params.from);
      if (params.to) qs.append('to', params.to);
      if (params.deviceIds?.length) qs.append('deviceIds', params.deviceIds.join(','));
      if (params.categoryIds?.length) qs.append('categoryIds', params.categoryIds.join(','));
      if (params.sourceTypes?.length) qs.append('sourceTypes', params.sourceTypes.join(','));
      if (params.cursor) qs.append('cursor', params.cursor);
      if (params.limit) qs.append('limit', String(params.limit));
      const res = await fetch(`${API_BASE}/timeline?${qs.toString()}`, { headers: getAuthHeader() });
      return handle(res);
    },

    async getDaySummary(date: string): Promise<DaySummaryBucket[]> {
      const res = await fetch(`${API_BASE}/timeline/day-summary?date=${encodeURIComponent(date)}`, {
        headers: getAuthHeader(),
      });
      return handle(res);
    },
  },

  timeIntelligence: {
    async getSummary(): Promise<TimeIntelligenceSummary> {
      const res = await fetch(`${API_BASE}/time-intelligence/summary`, { headers: getAuthHeader() });
      return handle(res);
    },

    async getAnomalies(date?: string): Promise<any[]> {
      const qs = date ? `?date=${encodeURIComponent(date)}` : '';
      const res = await fetch(`${API_BASE}/time-intelligence/anomalies${qs}`, { headers: getAuthHeader() });
      return handle(res);
    },

    async recompute(): Promise<any> {
      const res = await fetch(`${API_BASE}/time-intelligence/recompute`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      return handle(res);
    },
  },

  desktop: {
    async register(): Promise<{ deviceId: string; syncToken: string }> {
      const res = await fetch(`${API_BASE}/desktop/register`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      return handle(res);
    },

    async getStatus(): Promise<any> {
      const res = await fetch(`${API_BASE}/desktop/status`, { headers: getAuthHeader() });
      return handle(res);
    },
  },
};

export const automationV5Api = {
  async testRule(ruleId: string): Promise<any> {
    const res = await fetch(`/api/automation/rules/${ruleId}/test`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handle(res);
  },

  async testDraftRule(draft: any): Promise<any> {
    const res = await fetch(`/api/automation/rules/test-draft`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(draft),
    });
    return handle(res);
  },
};
