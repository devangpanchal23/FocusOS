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

// ---- V5.1 additions ----

export interface DesktopAgentSettings {
  collectWindowTitles: boolean;
  collectAppNames: boolean;
  excludedApplications: string[];
  excludedWindowPatterns: string[];
  [key: string]: any;
}

export interface IngestionStats {
  counts: {
    PENDING?: number;
    PROCESSING?: number;
    PROCESSED?: number;
    RETRYING?: number;
    FAILED?: number;
    PERMANENTLY_FAILED?: number;
    DUPLICATE?: number;
    [key: string]: number | undefined;
  };
  avgProcessingMs?: number;
  lastSuccessAt?: string | null;
  lastFailure?: { at: string; errorMessage: string } | null;
  [key: string]: any;
}

export interface TabSwitchingStats {
  totalSwitches?: number;
  switchesPerHour?: { hour: number; count: number }[];
  avgSecondsBeforeSwitch?: number;
  peakHour?: number;
  [key: string]: any;
}

export interface BrowserInstance {
  id: string;
  label?: string;
  lastSyncAt?: string;
  eventCount?: number;
  [key: string]: any;
}

export interface MobilePermission {
  permission: string;
  status: 'GRANTED' | 'DENIED' | 'NOT_REQUESTED' | 'UNKNOWN' | string;
  lastCheckedAt?: string;
  [key: string]: any;
}

export interface ShortFormHotspots {
  highestHour?: number;
  highestDay?: string;
  highestPeriod?: string;
  [key: string]: any;
}

export interface ShortFormHeatmapCell {
  hour: number;
  day: string;
  minutes: number;
  [key: string]: any;
}

export interface ShortFormPlatform {
  platform: string;
  totalMinutes: number;
  sessionCount: number;
  itemCount?: number;
  dataQualityMix?: Record<string, number>;
  [key: string]: any;
}

export interface ShortFormLoop {
  sequence: string[];
  occurrences: number;
  [key: string]: any;
}

export interface TimeIntelPeriod {
  key: string;
  label: string;
  start: string;
  end: string;
}

export interface TimeIntelPreferences {
  periods: TimeIntelPeriod[];
  [key: string]: any;
}

export interface PatternCard {
  title: string;
  timeRange?: string;
  sources?: string[];
  metric?: string;
  evidence?: string;
  [key: string]: any;
}

export interface AutomationTemplate {
  key: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  defaultConditionsJson?: any;
  defaultActionJson?: any;
  [key: string]: any;
}

export interface DataSourceRow {
  id: string;
  sourceType: string;
  deviceName?: string;
  status: string;
  lastSyncAt?: string;
  label?: string;
  eventCounts?: { byStatus?: Record<string, number> };
  lastError?: string;
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

    async getTabSwitching(from?: string, to?: string): Promise<TabSwitchingStats> {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      const qs = params.toString();
      const res = await fetch(`${API_BASE}/browser/tab-switching${qs ? `?${qs}` : ''}`, { headers: getAuthHeader() });
      return handle(res);
    },

    async getInstances(): Promise<BrowserInstance[]> {
      const res = await fetch(`${API_BASE}/browser/instances`, { headers: getAuthHeader() });
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
      search?: string;
    }): Promise<TimelineResponse> {
      const qs = new URLSearchParams();
      if (params.from) qs.append('from', params.from);
      if (params.to) qs.append('to', params.to);
      if (params.deviceIds?.length) qs.append('deviceIds', params.deviceIds.join(','));
      if (params.categoryIds?.length) qs.append('categoryIds', params.categoryIds.join(','));
      if (params.sourceTypes?.length) qs.append('sourceTypes', params.sourceTypes.join(','));
      if (params.cursor) qs.append('cursor', params.cursor);
      if (params.limit) qs.append('limit', String(params.limit));
      if (params.search) qs.append('search', params.search);
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

    async getPreferences(): Promise<TimeIntelPreferences> {
      const res = await fetch(`${API_BASE}/time-intelligence/preferences`, { headers: getAuthHeader() });
      return handle(res);
    },
    async updatePreferences(data: Partial<TimeIntelPreferences>): Promise<TimeIntelPreferences> {
      const res = await fetch(`${API_BASE}/time-intelligence/preferences`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      return handle(res);
    },
    async getDistractionWindows(): Promise<any[]> {
      const res = await fetch(`${API_BASE}/time-intelligence/distraction-windows`, { headers: getAuthHeader() });
      return handle(res);
    },
    async getContextSwitching(): Promise<any[]> {
      const res = await fetch(`${API_BASE}/time-intelligence/context-switching`, { headers: getAuthHeader() });
      return handle(res);
    },
    async getLongSessions(): Promise<any[]> {
      const res = await fetch(`${API_BASE}/time-intelligence/long-sessions`, { headers: getAuthHeader() });
      return handle(res);
    },
    async getUnusualSessions(): Promise<any[]> {
      const res = await fetch(`${API_BASE}/time-intelligence/unusual-sessions`, { headers: getAuthHeader() });
      return handle(res);
    },
    async getWeekdayWeekend(): Promise<any> {
      const res = await fetch(`${API_BASE}/time-intelligence/weekday-weekend`, { headers: getAuthHeader() });
      return handle(res);
    },
    async getPatternCards(): Promise<PatternCard[]> {
      const res = await fetch(`${API_BASE}/time-intelligence/pattern-cards`, { headers: getAuthHeader() });
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

    async getSettings(): Promise<DesktopAgentSettings> {
      const res = await fetch(`${API_BASE}/desktop/settings`, { headers: getAuthHeader() });
      return handle(res);
    },

    async updateSettings(data: Partial<DesktopAgentSettings>): Promise<DesktopAgentSettings> {
      const res = await fetch(`${API_BASE}/desktop/settings`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      return handle(res);
    },
  },

  ingestion: {
    async getStats(): Promise<IngestionStats> {
      const res = await fetch(`${API_BASE}/ingestion/stats`, { headers: getAuthHeader() });
      return handle(res);
    },
  },

  mobile: {
    async getPermissions(): Promise<MobilePermission[]> {
      const res = await fetch(`${API_BASE}/mobile/permissions`, { headers: getAuthHeader() });
      return handle(res);
    },
    async updatePermission(data: { permission: string; status: string }): Promise<any> {
      const res = await fetch(`${API_BASE}/mobile/permissions`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      return handle(res);
    },
    async generateLinkToken(): Promise<{ code: string; deviceId?: string; expiresAt?: string; [key: string]: any }> {
      const res = await fetch(`${API_BASE}/mobile/link-token`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      return handle(res);
    },
  },

  shortForm: {
    async getHotspots(): Promise<ShortFormHotspots> {
      const res = await fetch(`${API_BASE}/short-form/hotspots`, { headers: getAuthHeader() });
      return handle(res);
    },
    async getHeatmap(): Promise<ShortFormHeatmapCell[] | { insufficientData: true; [key: string]: any }> {
      const res = await fetch(`${API_BASE}/short-form/heatmap`, { headers: getAuthHeader() });
      return handle(res);
    },
    async getPlatforms(): Promise<ShortFormPlatform[]> {
      const res = await fetch(`${API_BASE}/short-form/platforms`, { headers: getAuthHeader() });
      return handle(res);
    },
    async getWeekly(): Promise<any> {
      const res = await fetch(`${API_BASE}/short-form/weekly`, { headers: getAuthHeader() });
      return handle(res);
    },
    async getMonthly(): Promise<any> {
      const res = await fetch(`${API_BASE}/short-form/monthly`, { headers: getAuthHeader() });
      return handle(res);
    },
    async getLoops(): Promise<ShortFormLoop[]> {
      const res = await fetch(`${API_BASE}/short-form/loops`, { headers: getAuthHeader() });
      return handle(res);
    },
  },

  automation: {
    async getTemplates(): Promise<AutomationTemplate[]> {
      const res = await fetch(`/api/automation/templates`, { headers: getAuthHeader() });
      return handle(res);
    },
    async instantiateTemplate(key: string): Promise<any> {
      const res = await fetch(`/api/automation/templates/${key}/instantiate`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      return handle(res);
    },
    async getDeliveryLog(ruleId: string): Promise<any[]> {
      const res = await fetch(`/api/automation/rules/${ruleId}/delivery-log`, { headers: getAuthHeader() });
      return handle(res);
    },
  },

  dataSources: {
    async list(): Promise<DataSourceRow[]> {
      const res = await fetch(`${API_BASE}/data-sources`, { headers: getAuthHeader() });
      return handle(res);
    },
  },

  syncCenter: {
    async list(): Promise<any[]> {
      const res = await fetch(`${API_BASE}/sync-center`, { headers: getAuthHeader() });
      return handle(res);
    },
    async retry(dataSourceId: string): Promise<any> {
      const res = await fetch(`${API_BASE}/sync-center/${dataSourceId}/retry`, {
        method: 'POST',
        headers: getAuthHeader(),
      });
      return handle(res);
    },
  },

  automationHistory: {
    async list(params: { page?: number; limit?: number } = {}): Promise<any> {
      const qs = new URLSearchParams();
      if (params.page) qs.append('page', String(params.page));
      if (params.limit) qs.append('limit', String(params.limit));
      const q = qs.toString();
      const res = await fetch(`/api/automation/history${q ? `?${q}` : ''}`, { headers: getAuthHeader() });
      return handle(res);
    },
  },

  dataManagement: {
    async export(params: { format: 'json' | 'csv'; from?: string; to?: string; sourceType?: string; deviceId?: string }): Promise<Blob> {
      const qs = new URLSearchParams();
      qs.append('format', params.format);
      if (params.from) qs.append('from', params.from);
      if (params.to) qs.append('to', params.to);
      if (params.sourceType) qs.append('sourceType', params.sourceType);
      if (params.deviceId) qs.append('deviceId', params.deviceId);
      const res = await fetch(`${API_BASE}/data-management/export?${qs.toString()}`, { headers: getAuthHeader() });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}: Export failed`);
      }
      return res.blob();
    },
    async purge(params: { from?: string; to?: string; sourceType?: string; deviceId?: string }): Promise<any> {
      const qs = new URLSearchParams();
      if (params.from) qs.append('from', params.from);
      if (params.to) qs.append('to', params.to);
      if (params.sourceType) qs.append('sourceType', params.sourceType);
      if (params.deviceId) qs.append('deviceId', params.deviceId);
      const res = await fetch(`${API_BASE}/data-management/purge?${qs.toString()}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
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
