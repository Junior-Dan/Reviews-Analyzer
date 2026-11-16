import { setCompanyLogo } from './theme';

export interface StoredUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  avatar?: string | null;
  companyLogo?: string | null;
  token?: string;
  [key: string]: unknown;
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function getStoredUser(): StoredUser {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

export function setAuthSession(data: StoredUser & { token?: string }) {
  if (data.token) {
    localStorage.setItem('token', data.token);
  }
  localStorage.setItem('user', JSON.stringify(data));
  setCompanyLogo(typeof data.companyLogo === 'string' && data.companyLogo.trim() ? data.companyLogo : null);
}

export function clearAuthSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  try {
    sessionStorage.removeItem('sentriqe_lens_intro_played');
    localStorage.removeItem('sentriqe_lens_intro_at');
  } catch {
    // ignore storage errors
  }
  setCompanyLogo(null);
}

export function getActiveWorkspaceId(): string | null {
  try {
    return localStorage.getItem('activeWorkspaceId');
  } catch {
    return null;
  }
}

export function setActiveWorkspaceId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem('activeWorkspaceId', id);
    } else {
      localStorage.removeItem('activeWorkspaceId');
    }
  } catch {
    // ignore storage errors
  }
}

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const activeWs = getActiveWorkspaceId();
  if (activeWs && !headers.has('X-Workspace-Id')) {
    headers.set('X-Workspace-Id', activeWs);
  }
  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, { ...options, headers });
  const method = (options.method || 'GET').toUpperCase();
  if (res.ok && method !== 'GET' && typeof window !== 'undefined' && !url.includes('/audit-logs/mark-seen')) {
    window.dispatchEvent(new Event('auditLogsUpdated'));
  }
  if (res.status === 401) {
    clearAuthSession();
    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/register')
    ) {
      window.location.replace('/login');
    }
  }
  return res;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await authFetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || `Request failed (${res.status})`);
  }
  return data as T;
}
