const BASE_URL = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('focus_auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('focus_auth_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('focus_auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Only set Content-Type if body is not FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 503) {
      throw new Error(data.error || 'Backend server is not running on port 5000.');
    }
    throw new Error(data.error || `HTTP ${response.status}: Request failed`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (payload: { email: string; password: string; name: string; timezone?: string }) =>
    request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: any }>('/auth/me'),

  updateProfile: (profileData: any) =>
    request<{ user: any }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    }),

  // Devices
  getDevices: () => request<{ devices: any[] }>('/devices'),

  createDevice: (data: { name: string; deviceType: string; os: string; timezone?: string }) =>
    request<{ device: any }>('/devices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteDevice: (id: string) =>
    request<{ message: string }>(`/devices/${id}`, {
      method: 'DELETE',
    }),

  // Uploads & Extractions
  uploadScreenshots: (formData: FormData) =>
    request<{ message: string; uploads: any[] }>('/uploads', {
      method: 'POST',
      body: formData,
    }),

  getUploads: () => request<{ uploads: any[] }>('/uploads'),

  getExtraction: (id: string) => request<{ extraction: any }>(`/uploads/extractions/${id}`),

  confirmExtraction: (id: string, payload: { editedFields?: any[]; confirmedDate?: string; confirmedDeviceId?: string }) =>
    request<{ message: string; date: string }>(`/uploads/extractions/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  rejectExtraction: (id: string) =>
    request<{ message: string }>(`/uploads/extractions/${id}/reject`, {
      method: 'POST',
    }),

  // Analytics
  getOverview: (date?: string) =>
    request<any>(`/analytics/overview${date ? `?date=${date}` : ''}`),

  getTrends: (days: number = 7) =>
    request<any>(`/analytics/trends?days=${days}`),

  getCategories: () => request<{ categories: any[] }>('/analytics/categories'),

  // Version 2 Endpoints

  // Insights
  getInsights: () => request<any[]>('/insights'),

  // Focus Studio
  getFocusProfiles: () => request<any[]>('/focus/profiles'),
  createFocusProfile: (data: any) =>
    request<any>('/focus/profiles', { method: 'POST', body: JSON.stringify(data) }),
  updateFocusProfile: (id: string, data: any) =>
    request<any>(`/focus/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFocusProfile: (id: string) =>
    request<any>(`/focus/profiles/${id}`, { method: 'DELETE' }),
  startFocusSession: (data: any) =>
    request<any>('/focus/sessions', { method: 'POST', body: JSON.stringify(data) }),
  recordDistraction: (id: string) =>
    request<any>(`/focus/sessions/${id}/distraction`, { method: 'POST' }),
  completeFocusSession: (id: string, data?: any) =>
    request<any>(`/focus/sessions/${id}/complete`, { method: 'POST', body: JSON.stringify(data || {}) }),
  abortFocusSession: (id: string, data?: any) =>
    request<any>(`/focus/sessions/${id}/abort`, { method: 'POST', body: JSON.stringify(data || {}) }),
  getFocusSessions: (limit: number = 20) =>
    request<any[]>(`/focus/sessions?limit=${limit}`),
  getFocusStats: () => request<any>('/focus/stats'),

  // Blocking
  getBlockRules: () => request<any[]>('/blocking/rules'),
  createBlockRule: (data: any) =>
    request<any>('/blocking/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateBlockRule: (id: string, data: any) =>
    request<any>(`/blocking/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBlockRule: (id: string) =>
    request<any>(`/blocking/rules/${id}`, { method: 'DELETE' }),
  overrideBlockRule: (id: string, data: { reason: string; overrideDurationMinutes: number }) =>
    request<any>(`/blocking/rules/${id}/override`, { method: 'POST', body: JSON.stringify(data) }),
  getBlockOverrides: () => request<any[]>('/blocking/overrides'),

  // Routines
  getRoutines: () => request<any[]>('/routines'),
  createRoutine: (data: any) =>
    request<any>('/routines', { method: 'POST', body: JSON.stringify(data) }),
  updateRoutine: (id: string, data: any) =>
    request<any>(`/routines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRoutine: (id: string) =>
    request<any>(`/routines/${id}`, { method: 'DELETE' }),

  // Automations
  getAutomationRules: () => request<any[]>('/automation/rules'),
  createAutomationRule: (data: any) =>
    request<any>('/automation/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateAutomationRule: (id: string, data: any) =>
    request<any>(`/automation/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAutomationRule: (id: string) =>
    request<any>(`/automation/rules/${id}`, { method: 'DELETE' }),
  getAutomationLogs: (limit: number = 50) =>
    request<any[]>(`/automation/logs?limit=${limit}`),
  evaluateAutomations: () =>
    request<any>('/automation/evaluate', { method: 'POST' }),

  // Gamification
  getGamification: () => request<any>('/gamification'),
  checkAchievements: () => request<any>('/gamification/check', { method: 'POST' }),

  // Notifications
  getNotifications: () => request<{ notifications: any[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: string) =>
    request<any>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () =>
    request<any>('/notifications/read-all', { method: 'PUT' }),
  deleteNotification: (id: string) =>
    request<any>(`/notifications/${id}`, { method: 'DELETE' }),

  // User Settings
  getSettings: () => request<any>('/settings'),
  updateSettings: (data: any) =>
    request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Export URLs
  getExportUrl: (type: 'csv' | 'json' | 'digest') => `/api/export/${type}`,
};

export const v3Api = {
  // AI Assistant
  getHistory: () => request<{ messages: any[] }>('/v3/assistant/history'),
  sendMessage: (content: string, sessionId?: string) =>
    request<any>('/v3/assistant/chat', { method: 'POST', body: JSON.stringify({ content, sessionId }) }),
  clearHistory: () => request<{ success: boolean }>('/v3/assistant/history', { method: 'DELETE' }),

  // AI Coach
  getProfile: () => request<{ profile: any }>('/v3/coach/profile'),
  updateProfile: (data: any) =>
    request<{ profile: any }>('/v3/coach/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getAssessment: () => request<any>('/v3/coach/assessment'),

  // Predictions & Risk
  getPredictions: () => request<any>('/v3/predictions'),
  getRisks: () => request<{ risks: any[] }>('/v3/predictions/risks'),
  dismissRisk: (riskId: string) =>
    request<any>(`/v3/predictions/risks/${riskId}/dismiss`, { method: 'POST' }),

  // SMART Goals
  getGoals: () => request<{ goals: any[] }>('/v3/goals'),
  createGoal: (data: any) =>
    request<{ goal: any }>('/v3/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id: string, data: any) =>
    request<{ goal: any }>(`/v3/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGoal: (id: string) =>
    request<any>(`/v3/goals/${id}`, { method: 'DELETE' }),
  generateGoalAiPlan: (prompt: string) =>
    request<any>('/v3/goals/plan', { method: 'POST', body: JSON.stringify({ prompt }) }),

  // AI Daily Planner
  getDailyPlan: (date?: string) =>
    request<{ plan: any }>(`/v3/planner${date ? `?date=${date}` : ''}`),
  generateDailyAiPlan: (date?: string) =>
    request<{ plan: any }>('/v3/planner/generate', { method: 'POST', body: JSON.stringify({ date }) }),
  addBlock: (data: any) =>
    request<{ block: any }>('/v3/planner/blocks', { method: 'POST', body: JSON.stringify(data) }),
  toggleBlock: (blockId: string) =>
    request<{ block: any }>(`/v3/planner/blocks/${blockId}/toggle`, { method: 'PATCH' }),
  deleteBlock: (blockId: string) =>
    request<any>(`/v3/planner/blocks/${blockId}`, { method: 'DELETE' }),

  // Accountability Circles
  getCircles: () => request<{ circles: any[] }>('/v3/circles'),
  createCircle: (data: { name: string; description?: string }) =>
    request<{ circle: any }>('/v3/circles', { method: 'POST', body: JSON.stringify(data) }),
  joinCircle: (inviteCode: string) =>
    request<any>('/v3/circles/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),
  leaveCircle: (circleId: string) =>
    request<any>(`/v3/circles/${circleId}/leave`, { method: 'POST' }),
  getLeaderboard: (circleId: string) =>
    request<{ circleId: string; circleName: string; leaderboard: any[] }>(`/v3/circles/${circleId}/leaderboard`),

  // Developer Platform
  getApiKeys: () => request<{ keys: any[] }>('/v3/developer/keys'),
  createApiKey: (data: { name: string; scopes?: string }) =>
    request<{ key: any }>('/v3/developer/keys', { method: 'POST', body: JSON.stringify(data) }),
  revokeApiKey: (keyId: string) =>
    request<any>(`/v3/developer/keys/${keyId}`, { method: 'DELETE' }),
  getWebhooks: () => request<{ webhooks: any[] }>('/v3/developer/webhooks'),
  createWebhook: (data: { url: string; events: string[] }) =>
    request<{ webhook: any }>('/v3/developer/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  deleteWebhook: (webhookId: string) =>
    request<any>(`/v3/developer/webhooks/${webhookId}`, { method: 'DELETE' }),
  testWebhook: (webhookId: string) =>
    request<any>(`/v3/developer/webhooks/${webhookId}/test`, { method: 'POST' }),

  // Privacy Center
  getPrivacySummary: () => request<any>('/v3/privacy/summary'),
  purgeData: (scope: string) =>
    request<any>('/v3/privacy/purge', { method: 'POST', body: JSON.stringify({ scope }) }),
  getAuditLogs: () => request<{ logs: any[] }>('/v3/privacy/audit-logs'),
};


