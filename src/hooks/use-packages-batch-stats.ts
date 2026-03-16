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

      // Fetch all lessons in batches to avoid the 1000-row default limit
      let allLessons: { package_id: string | null; status: string }[] = [];
      const batchSize = 500;
      
      // Also split package IDs into chunks to avoid too-large IN clauses
      const idChunks: string[][] = [];
      for (let i = 0; i < packageIds.length; i += batchSize) {
        idChunks.push(packageIds.slice(i, i + batchSize));
      }

      for (const chunk of idChunks) {
        let from = 0;
        const pageSize = 1000;
        while (true) {
          const { data: lessons, error } = await supabase
            .from('scheduled_lessons')
            .select('package_id, status')
            .in('package_id', chunk)
            .range(from, from + pageSize - 1);
          
          if (error) throw error;
          if (lessons) allLessons = allLessons.concat(lessons);
          if (!lessons || lessons.length < pageSize) break;
          from += pageSize;
        }
      }

      const lessons = allLessons;

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
