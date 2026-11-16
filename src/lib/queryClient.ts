import { QueryClient } from '@tanstack/react-query';
import { authFetch, getActiveWorkspaceId } from '../utils/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 15 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function useWorkspaceKey(): string {
  return getActiveWorkspaceId() || 'default';
}

export const queryKeys = {
  dashboardSummary: (wsId: string) => [wsId, 'dashboard-summary'] as const,
  reviewsAll: (wsId: string) => [wsId, 'reviews'] as const,
  reviews: (wsId: string, filters: Record<string, string>) => [wsId, 'reviews', filters] as const,
  packages: (wsId: string) => [wsId, 'packages'] as const,
  monitoredApps: (wsId: string) => [wsId, 'monitored-apps'] as const,
  team: (wsId: string) => [wsId, 'team'] as const,
  auditLogsAll: (wsId: string) => [wsId, 'audit-logs'] as const,
  auditLogs: (wsId: string, params: Record<string, string | number>) => [wsId, 'audit-logs', params] as const,
  auditLogsUnread: (wsId: string) => [wsId, 'audit-logs-unread'] as const,
  integrations: (wsId: string) => [wsId, 'integrations'] as const,
  profile: (wsId: string) => [wsId, 'profile'] as const,
  workspaces: () => ['workspaces'] as const,
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function authFetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await authFetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      res.status === 401
        ? 'Your session has expired. Please sign in again.'
        : res.status === 403
        ? 'You do not have permission to view this data.'
        : (typeof body?.message === 'string' && body.message) || 'Could not load data. Please try again.';
    throw new ApiError(msg, res.status);
  }
  return res.json() as Promise<T>;
}

/** Invalidate all queries that could be affected after app/review/team/integration mutations */
export function invalidateWorkspaceData(wsId: string) {
  void queryClient.invalidateQueries({ queryKey: [wsId] });
}
