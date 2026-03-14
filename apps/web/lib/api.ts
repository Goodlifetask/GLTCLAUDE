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
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as any;

      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;

        try {
          const { data } = await instance.post('/auth/refresh');
          const { access_token } = data.data;
          const store = getAuthStore();
          store?.getState().setAccessToken(access_token);
          original.headers.Authorization = `Bearer ${access_token}`;
          return instance(original);
        } catch {
          const store = getAuthStore();
          store?.getState().logout();
          window.location.href = '/login';
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
  },

  users: {
    me: () =>
      client.get('/users/me').then((r) => r.data),
    updateProfile: (data: Partial<{ name: string; locale: string; timezone: string; theme: string }>) =>
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
      client.delete('/users/me/delete').then((r) => r.data),
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
      client.get('/subscriptions/current').then((r) => r.data),
    createCheckout: (plan: string, successUrl: string, cancelUrl: string) =>
      client.post('/subscriptions/checkout', { plan, success_url: successUrl, cancel_url: cancelUrl }).then((r) => r.data),
    openPortal: () =>
      client.post('/subscriptions/portal').then((r) => r.data),
  },
};

export type ApiClient = typeof api;
