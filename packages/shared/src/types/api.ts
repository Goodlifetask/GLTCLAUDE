/** Standardised API response envelope */
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/** Standardised error response */
export interface ApiError {
  error: string;
  message: string;
  code: ApiErrorCode;
  details?: Array<{ field: string; message: string }>;
  requestId?: string;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PLAN_LIMIT_REACHED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

/** Pagination query params */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/** Admin RBAC */
export type AdminRole =
  | 'super_admin'
  | 'administrator'
  | 'moderator'
  | 'support'
  | 'read_only';

export type AdminModule =
  | 'dashboard'
  | 'users'
  | 'roles'
  | 'categories'
  | 'themes'
  | 'languages'
  | 'push_notifications'
  | 'web_ads'
  | 'mobile_ads'
  | 'integrations'
  | 'voice_assistants'
  | 'calendar_sync'
  | 'email_integrations'
  | 'api_keys'
  | 'analytics'
  | 'activity_logs'
  | 'subscriptions'
  | 'billing'
  | 'security'
  | 'app_settings';

export type Permission = 'read' | 'write' | 'delete' | 'export' | 'admin';
