/**
 * API client for GoodLifeTask REST API.
 * Uses axios with JWT bearer token (stored in memory/zustand).
 */
import axios, { AxiosError, AxiosInstance } from 'axios';

// Lazy to avoid SSR issues — only used in browser interceptors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _authStore: any = null;
function getAuthStore() {
  if (!_authStore && typeof window !== 'undefined') {
    _authStore = require('../store/auth').useAuthStore;
  }
  return _authStore;
}

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '/api/v1';

// Single shared refresh promise — prevents concurrent refresh storms
let _refreshPromise: Promise<string> | null = null;

function createApiClient(): AxiosInstance {
  const instance = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
    withCredentials: true, // Send refresh token cookie
  });

  // Request interceptor: attach access token
  instance.interceptors.request.use((config) => {
    const store = getAuthStore();
    const token = store?.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response interceptor: auto-refresh on 401
  // Uses a shared promise so concurrent 401s all wait for the same refresh
  // instead of each firing their own, which burns through refresh tokens.
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as any;

      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;

        if (!_refreshPromise) {
          _refreshPromise = instance.post('/auth/refresh')
            .then(({ data }) => {
              const token = data.data.access_token;
              getAuthStore()?.getState().setAccessToken(token);
              return token;
            })
            .catch((err) => {
              getAuthStore()?.getState().logout();
              if (typeof window !== 'undefined') window.location.href = '/login';
              throw err;
            })
            .finally(() => {
              _refreshPromise = null;
            });
        }

        try {
          const token = await _refreshPromise;
          original.headers.Authorization = `Bearer ${token}`;
          return instance(original);
        } catch {
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    },
  );

  return instance;
}

const client = createApiClient();

// ─── API Endpoints ─────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string }) =>
      client.post('/auth/register', data).then((r) => r.data),
    login: (data: { email: string; password: string }) =>
      client.post('/auth/login', data).then((r) => r.data),
    logout: () =>
      client.post('/auth/logout').then((r) => r.data),
    magicLink: (email: string) =>
      client.post('/auth/magic-link', { email }).then((r) => r.data),
    forgotPassword: (email: string) =>
      client.post('/auth/forgot-password', { email }).then((r) => r.data),
    resetPassword: (token: string, password: string) =>
      client.post('/auth/reset-password', { token, password }).then((r) => r.data),
  },

  users: {
    me: () =>
      client.get('/users/me').then((r) => r.data),
    updateProfile: (data: Partial<{ name: string; locale: string; timezone: string; theme: string; persona: string; occupation: string; profileCategory: string; profileSubType: string; taskPreferences: string[] }>) =>
      client.patch('/users/me', data).then((r) => r.data),
    uploadAvatar: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return client.post('/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
    stats: () =>
      client.get('/users/me/stats').then((r) => r.data),
    requestExport: () =>
      client.post('/users/me/export').then((r) => r.data),
    deleteAccount: () =>
      client.delete('/users/me').then((r) => r.data),
    changePassword: (currentPassword: string, newPassword: string) =>
      client.patch('/users/me/password', { currentPassword, newPassword }).then((r) => r.data),
  },

  countries: {
    list: () =>
      client.get('/countries').then((r) => r.data),
  },

  categories: {
    list: () =>
      client.get('/categories').then((r) => r.data),
  },

  professions: {
    list: () =>
      client.get('/professions').then((r) => r.data),
  },

  reminders: {
    list: (params?: Record<string, unknown>) =>
      client.get('/reminders', { params }).then((r) => r.data),
    get: (id: string) =>
      client.get(`/reminders/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      client.post('/reminders', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      client.patch(`/reminders/${id}`, data).then((r) => r.data),
    delete: (id: string) =>
      client.delete(`/reminders/${id}`).then((r) => r.data),
    complete: (id: string) =>
      client.post(`/reminders/${id}/complete`).then((r) => r.data),
    snooze: (id: string, durationMinutes: number) =>
      client.post(`/reminders/${id}/snooze`, { duration_minutes: durationMinutes }).then((r) => r.data),
    duplicate: (id: string) =>
      client.post(`/reminders/${id}/duplicate`).then((r) => r.data),
  },

  lists: {
    list: () =>
      client.get('/lists').then((r) => r.data),
    create: (data: { name: string; color?: string; icon?: string }) =>
      client.post('/lists', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      client.patch(`/lists/${id}`, data).then((r) => r.data),
    delete: (id: string) =>
      client.delete(`/lists/${id}`).then((r) => r.data),
  },

  devices: {
    register: (data: { platform: string; token: string; app_version?: string }) =>
      client.post('/devices', data).then((r) => r.data),
    unregister: (token: string) =>
      client.delete(`/devices/${encodeURIComponent(token)}`).then((r) => r.data),
  },

  integrations: {
    calendars: {
      list: () =>
        client.get('/integrations/calendar').then((r) => r.data),
      initiateOAuth: (provider: string) =>
        client.get(`/integrations/calendar/${provider}/connect`).then((r) => r.data),
      sync: (id: string) =>
        client.post(`/integrations/calendar/${id}/sync`).then((r) => r.data),
      disconnect: (id: string) =>
        client.delete(`/integrations/calendar/${id}`).then((r) => r.data),
    },
  },

  subscriptions: {
    current: () =>
      client.get('/subscriptions/me').then((r) => r.data),
    createCheckout: (plan: string, successUrl: string, cancelUrl: string) =>
      client.post('/subscriptions/checkout', { plan, success_url: successUrl, cancel_url: cancelUrl }).then((r) => r.data),
    openPortal: () =>
      client.post('/subscriptions/portal').then((r) => r.data),
  },

  family: {
    create: (data: { name: string; avatarUrl?: string }) =>
      client.post('/family', data).then((r) => r.data),
    get: () =>
      client.get('/family/me').then((r) => r.data),
    update: (data: { name?: string; avatarUrl?: string }) =>
      client.patch('/family/me', data).then((r) => r.data),
    invite: (data: { email: string; role?: string }) =>
      client.post('/family/invite', data).then((r) => r.data),
    acceptInvite: (token: string) =>
      client.post('/family/invite/accept', { token }).then((r) => r.data),
    removeMember: (memberId: string) =>
      client.delete(`/family/members/${memberId}`).then((r) => r.data),
    reminders: (params?: Record<string, unknown>) =>
      client.get('/family/reminders', { params }).then((r) => r.data),
    createReminder: (data: Record<string, unknown>) =>
      client.post('/family/reminders', data).then((r) => r.data),
    uploadAvatar: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return client.post('/family/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
  },

  menuConfig: {
    get: () =>
      client.get('/menu-config').then((r) => r.data),
  },

  familyAlarms: {
    list: (params?: { page?: number; limit?: number }) =>
      client.get('/family-alarms', { params }).then((r) => r.data),
    get: (id: string) =>
      client.get(`/family-alarms/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      client.post('/family-alarms', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      client.patch(`/family-alarms/${id}`, data).then((r) => r.data),
    delete: (id: string) =>
      client.delete(`/family-alarms/${id}`).then((r) => r.data),
    planStatus: () =>
      client.get('/family-alarms/plan-status').then((r) => r.data),
    voiceLabels: () =>
      client.get('/family-alarms/voice-labels').then((r) => r.data),
    uploadVoice: (id: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return client.post(`/family-alarms/${id}/voice`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
  },

  team: {
    workspaces: {
      list: () =>
        client.get('/team/workspaces').then((r) => r.data),
      create: (data: { name: string; description?: string; avatarUrl?: string }) =>
        client.post('/team/workspaces', data).then((r) => r.data),
      get: (id: string) =>
        client.get(`/team/workspaces/${id}`).then((r) => r.data),
      update: (id: string, data: { name?: string; description?: string; avatarUrl?: string }) =>
        client.patch(`/team/workspaces/${id}`, data).then((r) => r.data),
      invite: (id: string, data: { email: string; role?: string }) =>
        client.post(`/team/workspaces/${id}/invite`, data).then((r) => r.data),
      removeMember: (id: string, memberId: string) =>
        client.delete(`/team/workspaces/${id}/members/${memberId}`).then((r) => r.data),
    },
    projects: {
      list: (workspaceId: string) =>
        client.get(`/team/workspaces/${workspaceId}/projects`).then((r) => r.data),
      create: (workspaceId: string, data: { name: string; description?: string; color?: string; icon?: string; dueDate?: string }) =>
        client.post(`/team/workspaces/${workspaceId}/projects`, data).then((r) => r.data),
      update: (workspaceId: string, projectId: string, data: Record<string, unknown>) =>
        client.patch(`/team/workspaces/${workspaceId}/projects/${projectId}`, data).then((r) => r.data),
    },
    reminders: {
      list: (workspaceId: string, params?: Record<string, unknown>) =>
        client.get(`/team/workspaces/${workspaceId}/reminders`, { params }).then((r) => r.data),
      create: (workspaceId: string, data: Record<string, unknown>) =>
        client.post(`/team/workspaces/${workspaceId}/reminders`, data).then((r) => r.data),
    },
  },
};

export type ApiClient = typeof api;
