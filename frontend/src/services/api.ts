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
};
