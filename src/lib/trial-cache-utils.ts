import { QueryClient } from '@tanstack/react-query';

/**
 * Shared trial lesson cache invalidation.
 * Call this after ANY trial lesson or trial student mutation
 * to ensure Admin and Teacher views stay in sync.
 */
export function invalidateAllTrialCaches(queryClient: QueryClient) {
  // Teacher trial queries
  queryClient.invalidateQueries({ queryKey: ['teacher-trial-full'] });
  queryClient.invalidateQueries({ queryKey: ['teacher-trial-calendar'] });
  queryClient.invalidateQueries({ queryKey: ['teacher-todays-trial-lessons'] });
  queryClient.invalidateQueries({ queryKey: ['teacher-pending-trial-lessons'] });
  queryClient.invalidateQueries({ queryKey: ['teacher-all-trial-lessons'] });
  queryClient.invalidateQueries({ queryKey: ['teacher-monthly-stats'] });
  queryClient.invalidateQueries({ queryKey: ['teacher-live-stats'] });

  // Admin trial queries
  queryClient.invalidateQueries({ queryKey: ['trial-students'] });
  queryClient.invalidateQueries({ queryKey: ['trial-student'] });
  queryClient.invalidateQueries({ queryKey: ['admin-teacher-trial-calendar'] });
  queryClient.invalidateQueries({ queryKey: ['admin-teacher-trial-lessons'] });
  queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
  queryClient.invalidateQueries({ queryKey: ['admin-payroll-unified'] });
  queryClient.invalidateQueries({ queryKey: ['admin-teacher-performance'] });

  // Shared
  queryClient.invalidateQueries({ queryKey: ['teacher-total-hours'] });
}
