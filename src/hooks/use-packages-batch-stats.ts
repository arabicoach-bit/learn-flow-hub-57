import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PackageBatchStats {
  used: number;      // completed + absent
  scheduled: number; // remaining scheduled lessons (= wallet for this package)
}

/**
 * Batch-fetches lesson stats for a list of package IDs in one query.
 * Now fetches ALL statuses to compute both used and scheduled counts.
 */
export function usePackagesBatchStats(packageIds: string[]) {
  return useQuery({
    queryKey: ['packages-batch-stats', packageIds.sort().join(',')],
    queryFn: async () => {
      if (packageIds.length === 0) return {} as Record<string, PackageBatchStats>;

      const { data: lessons } = await supabase
        .from('scheduled_lessons')
        .select('package_id, status')
        .in('package_id', packageIds);

      const result: Record<string, PackageBatchStats> = {};
      
      // Initialize all packages
      packageIds.forEach(id => {
        result[id] = { used: 0, scheduled: 0 };
      });

      // Count per package
      (lessons || []).forEach(l => {
        if (l.package_id && result[l.package_id]) {
          if (l.status === 'completed' || l.status === 'absent') {
            result[l.package_id].used += 1;
          } else if (l.status === 'scheduled') {
            result[l.package_id].scheduled += 1;
          }
        }
      });

      return result;
    },
    staleTime: 60_000,
    enabled: packageIds.length > 0,
  });
}
