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

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
        supabase
          .from('leads')
          .select('lead_id', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString()),
        supabase
          .from('students')
          .select('student_id', { count: 'exact', head: true })
          .lte('wallet_balance', 2),
        supabase
          .from('lessons_log')
          .select('lesson_id', { count: 'exact', head: true })
          .gte('date', startOfDay.toISOString()),
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
