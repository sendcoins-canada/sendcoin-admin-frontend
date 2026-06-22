/**
 * Activity Service
 * Fetches the unified platform activity feed.
 */

import { api } from '../lib/api';
import type { ActivityItem, ActivityFilters } from '../types/activity';
import type { PaginatedResponse } from '../types/common';

export const activityService = {
  /**
   * Get paginated activity feed (backend returns { data, pagination }).
   */
  getActivity: async (
    filters?: ActivityFilters & { page?: number; limit?: number }
  ): Promise<PaginatedResponse<ActivityItem>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await api.get('/activity', { params: filters });
    const data: ActivityItem[] = response?.data ?? [];
    const pagination = response?.pagination ?? {};
    const page = pagination.page ?? 1;
    const totalPages = pagination.totalPages ?? 1;
    return {
      data,
      pagination: {
        page,
        limit: pagination.limit ?? 20,
        total: pagination.total ?? data.length,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  },
};

export default activityService;
