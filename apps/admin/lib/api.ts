// Admin API client — proxies through Next.js rewrites to http://localhost:3001/v1

const BASE = '/api/v1';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

// Raw shape returned by POST /auth/login
interface RawLoginResponse {
  data: {
    user: { id: string; email: string; name: string; plan: string };
    tokens: { access_token: string; refresh_token: string };
  };
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    plan: string;
  };
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  totalReminders: number;
  remindersCompletedToday: number;
  activeSubscriptions: number;
  proUsers: number;
  freeUsers: number;
}

export type UserRole = 'user' | 'super_admin' | 'administrator' | 'moderator' | 'support_agent' | 'read_only';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: UserRole;
  createdAt: string;
  reminderCount: number;
  status: 'active' | 'inactive';
  persona?: string | null;
  occupation?: string | null;
  familyGroupId?:     string | null;
  familyGroupName?:   string | null;
  familyRole?:        string | null;
  teamWorkspaceId?:   string | null;
  teamWorkspaceName?: string | null;
  teamRole?:          string | null;
}

export interface AdminUsersResponse {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  status?: string;
}

export interface AdminReminder {
  id: string;
  userId: string;
  userEmail: string;
  type: string;
  title: string;
  status: string;
  priority: string;
  fireAt: string;
  completedAt: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface AdminRemindersResponse {
  data: AdminReminder[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminRemindersParams {
  page?: number;
  limit?: number;
  userId?: string;
  type?: string;
  status?: string;
}

export interface UpdateUserPayload {
  plan?: 'free' | 'pro' | 'team' | 'family';
  status?: 'active' | 'inactive';
  role?: UserRole;
}

// ─── Regions & Languages ─────────────────────────────────────────────────────

export interface LanguageItem {
  id: string;
  name: string;
  code: string;
  isRtl: boolean;
  isActive: boolean;
}

export interface CountryItem {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  languages: LanguageItem[];
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface UserStats {
  total: number;
  completed: number;
  overdue: number;
  upcoming: number;
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export interface Reminder {
  id: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  priority?: string;
  listId?: string;
}

export interface RemindersListParams {
  page?: number;
  limit?: number;
  completed?: boolean;
  listId?: string;
}

export interface RemindersListResponse {
  data: Reminder[];
  total: number;
  page: number;
  limit: number;
}

// ─── Lists ───────────────────────────────────────────────────────────────────

export interface ReminderList {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

// ─── Translations ────────────────────────────────────────────────────────────

export interface TranslationKey {
  id: string;
  key: string;
  namespace: string;
  description?: string | null;
  defaultValue: string;
  isStatic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationEntry {
  keyId: string;
  key: string;
  namespace: string;
  description?: string | null;
  defaultValue: string;
  translation: string | null;
  isApproved: boolean;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface TranslationsForLangResponse {
  langCode: string;
  total: number;
  translated: number;
  missing: number;
  data: TranslationEntry[];
}

export interface TranslationKeysResponse {
  data: TranslationKey[];
  total: number;
  page: number;
  limit: number;
}

export interface UpsertTranslationPayload {
  keyId: string;
  langCode: string;
  value: string;
}

export interface BulkUpsertTranslationsPayload {
  langCode: string;
  translations: Array<{ keyId: string; value: string }>;
}

// ─── Families ─────────────────────────────────────────────────────────────────

export interface FamilyMemberItem {
  role: string;
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
}

export interface AdminFamily {
  id: string;
  name: string;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  members: FamilyMemberItem[];
}

export interface AdminFamiliesResponse {
  data: AdminFamily[];
  total: number;
  page: number;
  limit: number;
}

// ─── Subscription ────────────────────────────────────────────────────────────

export interface Subscription {
  plan: string;
  status: string;
  expiresAt?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function queryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ─── API object ──────────────────────────────────────────────────────────────

export const adminApi = {
  auth: {
    login: async (payload: LoginPayload): Promise<LoginResponse> => {
      const raw = await request<RawLoginResponse>('POST', '/admin/auth/login', payload);
      return {
        accessToken: raw.data.tokens.access_token,
        user: raw.data.user,
      };
    },
  },

  users: {
    // Returns the current logged-in user's profile (admin account)
    me: () => request<LoginResponse['user']>('GET', '/users/me'),

    // Returns stats for the current user (not aggregate admin stats)
    // NOTE: For real aggregate admin stats (total users, etc.), a dedicated
    //       admin endpoint would be needed on the backend.
    myStats: () => request<UserStats>('GET', '/users/me/stats'),
  },

  reminders: {
    list: (params?: RemindersListParams) => {
      const qs = params
        ? '?' + new URLSearchParams(
            Object.entries(params)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          ).toString()
        : '';
      return request<RemindersListResponse>('GET', `/reminders${qs}`);
    },
    create: (data: Partial<Reminder>) =>
      request<Reminder>('POST', '/reminders', data),
    update: (id: string, data: Partial<Reminder>) =>
      request<Reminder>('PATCH', `/reminders/${id}`, data),
    delete: (id: string) =>
      request<void>('DELETE', `/reminders/${id}`),
    complete: (id: string) =>
      request<Reminder>('POST', `/reminders/${id}/complete`),
  },

  lists: {
    list: () => request<ReminderList[]>('GET', '/lists'),
    create: (data: Partial<ReminderList>) =>
      request<ReminderList>('POST', '/lists', data),
  },

  subscriptions: {
    current: () => request<Subscription>('GET', '/subscriptions/current'),
  },

  admin: {
    stats: () =>
      request<AdminStats>('GET', '/admin/stats'),
    users: (params?: AdminUsersParams) =>
      request<AdminUsersResponse>('GET', '/admin/users' + queryString(params as Record<string, string | number | boolean | undefined>)),
    createUser: (data: { name: string; email: string; password: string; plan: 'free' | 'pro' | 'team' | 'family'; role: UserRole }) =>
      request<{ success: boolean; data: AdminUser }>('POST', '/admin/users', data),
    reminders: (params?: AdminRemindersParams) =>
      request<AdminRemindersResponse>('GET', '/admin/reminders' + queryString(params as Record<string, string | number | boolean | undefined>)),
    updateUser: (id: string, data: UpdateUserPayload) =>
      request<{ success: boolean; data: AdminUser }>('PATCH', `/admin/users/${id}`, data),
    bulkAssignRole: (userIds: string[], role: UserRole) =>
      request<{ success: boolean; updated: number }>('POST', '/admin/users/bulk-role', { userIds, role }),
    countries: () =>
      request<{ data: CountryItem[] }>('GET', '/admin/countries'),
    resetUserPassword: (id: string) =>
      request<{ success: boolean; data: { userId: string; email: string; tempPassword: string } }>(
        'POST', `/admin/users/${id}/reset-password`, {},
      ),
    families: (params?: { page?: number; limit?: number; search?: string }) =>
      request<AdminFamiliesResponse>('GET', '/admin/families' + queryString(params as Record<string, string | number | boolean | undefined>)),
    createFamily: (data: { name: string; ownerId: string }) =>
      request<{ success: boolean; data: AdminFamily }>('POST', '/admin/families', data),
    addFamilyMember: (familyId: string, data: { userId: string; role?: string }) =>
      request<{ success: boolean; data: AdminFamily }>('POST', `/admin/families/${familyId}/members`, data),
    removeFamilyMember: (familyId: string, userId: string) =>
      request<void>('DELETE', `/admin/families/${familyId}/members/${userId}`),
    deleteFamily: (familyId: string) =>
      request<void>('DELETE', `/admin/families/${familyId}`),
  },

  translations: {
    keys: (params?: { namespace?: string; search?: string; page?: number; limit?: number }) =>
      request<TranslationKeysResponse>('GET', '/admin/translations/keys' + queryString(params as Record<string, string | number | boolean | undefined>)),
    forLanguage: (langCode: string, params?: { namespace?: string; search?: string; onlyMissing?: boolean }) =>
      request<TranslationsForLangResponse>('GET', `/admin/translations/language/${langCode}` + queryString(params as Record<string, string | number | boolean | undefined>)),
    upsert: (payload: UpsertTranslationPayload) =>
      request<{ success: boolean }>('PUT', '/admin/translations/', payload),
    bulkUpsert: (payload: BulkUpsertTranslationsPayload) =>
      request<{ success: boolean; upserted: number }>('PUT', '/admin/translations/bulk', payload),
    createKey: (data: { key: string; namespace: string; defaultValue: string; description?: string; isStatic?: boolean }) =>
      request<{ success: boolean; data: TranslationKey }>('POST', '/admin/translations/keys', data),
    updateKey: (id: string, data: Partial<TranslationKey>) =>
      request<{ success: boolean; data: TranslationKey }>('PATCH', `/admin/translations/keys/${id}`, data),
    exportLang: (langCode: string) =>
      request<Record<string, string>>('GET', `/admin/translations/export/${langCode}`),
  },
};
