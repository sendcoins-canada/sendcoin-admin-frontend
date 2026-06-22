/**
 * Activity Hooks
 * React Query hooks for the unified activity feed.
 */

import { useQuery } from '@tanstack/react-query';
import { activityService } from '../services/activityService';
import { queryKeys } from '../lib/queryClient';
import type { ActivityFilters } from '../types/activity';

/**
 * Hook to get the paginated activity feed. Polls every 30s so the feed stays
 * fresh without manual refresh — matching the notification bell cadence.
 */
export const useActivity = (
  filters?: ActivityFilters & { page?: number; limit?: number }
) => {
  return useQuery({
    queryKey: queryKeys.activity.list(filters),
    queryFn: () => activityService.getActivity(filters),
    refetchInterval: 30000,
  });
};
