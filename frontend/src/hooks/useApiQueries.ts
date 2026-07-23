import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/utils/apiClient';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: ({ signal }) => apiClient('/api/dashboard/summary', { signal }),
    staleTime: 60 * 1000, // 60 seconds cache
  });
}

export function useTasksQuery(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['tasks', params || {}],
    queryFn: ({ signal }) => apiClient('/api/tasks', { params, signal }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useBugsQuery() {
  return useQuery({
    queryKey: ['bugs'],
    queryFn: ({ signal }) => apiClient('/api/bugs', { signal }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUsersQuery() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async ({ signal }) => {
      const res = await apiClient('/api/users', { signal });
      return (res || []).map((u: any) => ({
        ...u,
        roles: Array.isArray(u.roles) ? u.roles.map((r: string) => r.replace(/^ROLE_/, '')) : [],
      }));
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useSprintsQuery() {
  return useQuery({
    queryKey: ['sprints'],
    queryFn: ({ signal }) => apiClient('/api/sprints', { signal }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNotificationsQuery(userId?: number) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: ({ signal }) => userId ? apiClient(`/api/notifications/for-user/${userId}`, { signal }) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useLeaderboardQuery(period = 'ALL_TIME', size = 20) {
  return useQuery({
    queryKey: ['leaderboard', period, size],
    queryFn: ({ signal }) => apiClient('/api/recognition/leaderboard', { params: { period, size }, signal }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAuditsQuery(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['audits', params || {}],
    queryFn: ({ signal }) => apiClient('/api/audit', { params, signal }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useConfigsQuery() {
  return useQuery({
    queryKey: ['configs'],
    queryFn: ({ signal }) => apiClient('/api/configs', { signal }),
    staleTime: Infinity, // Static lookup data
  });
}

/**
 * Intelligent Background Prefetching Helper
 * Called after Dashboard renders successfully to prefetch likely next pages.
 */
export function usePrefetchModules() {
  const queryClient = useQueryClient();

  const prefetchNextModules = useCallback(() => {
    // Prefetch Notifications
    queryClient.prefetchQuery({
      queryKey: ['notifications'],
      queryFn: ({ signal }) => apiClient('/api/notifications', { signal }),
      staleTime: 60 * 1000,
    });

    // Prefetch Leaderboard
    queryClient.prefetchQuery({
      queryKey: ['leaderboard', 'ALL_TIME', 20],
      queryFn: ({ signal }) => apiClient('/api/recognition/leaderboard', { params: { period: 'ALL_TIME', size: 20 }, signal }),
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch Sprints
    queryClient.prefetchQuery({
      queryKey: ['sprints'],
      queryFn: ({ signal }) => apiClient('/api/sprints', { signal }),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  return { prefetchNextModules };
}
