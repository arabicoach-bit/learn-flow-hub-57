import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  activeStudents: number;
  graceStudents: number;
  blockedStudents: number;
  totalLeadsThisMonth: number;
  pendingRenewals: number;
  todaysLessons: number;
}

export function useDashboardStats(startDate?: string | null, endDate?: string | null) {
  return useQuery({
    queryKey: ['dashboard-stats', startDate, endDate],
    queryFn: async (): Promise<DashboardStats> => {
      const [
        activeResult,
        graceResult,
        blockedResult,
        leadsResult,
        renewalsResult,
        lessonsResult,
      ] = await Promise.all([
        supabase
          .from('students')
          .select('student_id', { count: 'exact', head: true })
          .eq('status', 'Active'),
        supabase
          .from('students')
          .select('student_id', { count: 'exact', head: true })
          .eq('status', 'Temporary Stop'),
        supabase
          .from('students')
          .select('student_id', { count: 'exact', head: true })
          .eq('status', 'Left'),
        // Leads filtered by date range
        (() => {
          let q = supabase.from('leads').select('lead_id', { count: 'exact', head: true });
          if (startDate) q = q.gte('created_at', startDate);
          if (endDate) q = q.lte('created_at', endDate + 'T23:59:59');
          return q;
        })(),
        supabase
          .from('students')
          .select('student_id', { count: 'exact', head: true })
          .lte('wallet_balance', 2),
        // Lessons filtered by date range (from scheduled_lessons)
        (() => {
          let q = supabase.from('scheduled_lessons').select('scheduled_lesson_id', { count: 'exact', head: true }).eq('status', 'completed');
          if (startDate) q = q.gte('scheduled_date', startDate);
          if (endDate) q = q.lte('scheduled_date', endDate);
          return q;
        })(),
      ]);

      return {
        activeStudents: activeResult.count || 0,
        graceStudents: graceResult.count || 0,
        blockedStudents: blockedResult.count || 0,
        totalLeadsThisMonth: leadsResult.count || 0,
        pendingRenewals: renewalsResult.count || 0,
        todaysLessons: lessonsResult.count || 0,
      };
    },
  });
}
