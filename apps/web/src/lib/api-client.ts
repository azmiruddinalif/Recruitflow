import type { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from '@recruitflow/types';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly errors: Array<{ field?: string; message: string; code?: string }>;

  constructor(message: string, statusCode = 500, errors: ApiErrorResponse['errors'] = []) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  organizationId?: string;
  params?: Record<string, string | number | boolean | undefined>;
}

// In production this points straight at the deployed API host so requests
// go browser -> API directly. Vercel's edge rewrite proxy (used for local
// dev against `next.config.mjs`'s rewrites) refuses to forward to some
// external hosts as an SSRF precaution (DNS_HOSTNAME_RESOLVED_PRIVATE), so
// relying on it in production is not an option once the API lives elsewhere.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function getStoredOrgId(): string {
  if (typeof window === 'undefined') return 'org_acme_cloud';
  return window.localStorage.getItem('rf_active_org_id') || 'org_acme_cloud';
}

function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('rf_auth_token');
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiSuccessResponse<T>> {
  const { body, organizationId, params, headers: customHeaders, ...rest } = options;

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${API_BASE}${cleanEndpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.set(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = new Headers(customHeaders);
  if (!(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const orgId = organizationId || getStoredOrgId();
  if (orgId) {
    headers.set('X-Organization-Id', orgId);
  }

  const token = getStoredAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...rest,
    headers,
    credentials: 'include',
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || (payload && payload.success === false)) {
    const errMsg =
      (payload && 'message' in payload && payload.message) ||
      `Request failed with status ${response.status}`;
    const errList = payload && 'errors' in payload && Array.isArray(payload.errors) ? payload.errors : [];
    throw new ApiClientError(errMsg, response.status, errList);
  }

  if (payload && payload.success === true) {
    return payload;
  }

  return {
    success: true,
    message: 'OK',
    data: (payload as unknown as T) ?? ({} as T),
  };
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
