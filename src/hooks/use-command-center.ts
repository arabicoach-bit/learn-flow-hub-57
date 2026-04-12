import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

export interface CommandCenterData {
  // Today's lessons
  todaysLessons: number;
  todaysCompleted: number;
  todaysAbsent: number;
  todaysScheduled: number;
  // Urgent attention
  lowBalanceStudents: { student_id: string; name: string; wallet_balance: number }[];
  temporaryStopStudents: number;
  // Leads needing follow-up
  overdueFollowups: number;
  // Today's trials
  todaysTrials: number;
}

export function useCommandCenter() {
  return useQuery({
    queryKey: ['command-center', format(new Date(), 'yyyy-MM-dd')],
    queryFn: async (): Promise<CommandCenterData> => {
      const today = format(new Date(), 'yyyy-MM-dd');

      const [
        todaysLessonsResult,
        todaysCompletedResult,
        todaysAbsentResult,
        todaysScheduledResult,
        lowBalanceResult,
        tempStopResult,
        overdueFollowupsResult,
        todaysTrialsResult,
      ] = await Promise.all([
        // Total today's lessons
        supabase
          .from('scheduled_lessons')
          .select('scheduled_lesson_id', { count: 'exact', head: true })
          .eq('scheduled_date', today),
        // Completed today
        supabase
          .from('scheduled_lessons')
          .select('scheduled_lesson_id', { count: 'exact', head: true })
          .eq('scheduled_date', today)
          .eq('status', 'completed'),
        // Absent today
        supabase
          .from('scheduled_lessons')
          .select('scheduled_lesson_id', { count: 'exact', head: true })
          .eq('scheduled_date', today)
          .eq('status', 'absent'),
        // Still scheduled (not marked)
        supabase
          .from('scheduled_lessons')
          .select('scheduled_lesson_id', { count: 'exact', head: true })
          .eq('scheduled_date', today)
          .eq('status', 'scheduled'),
        // Low balance students (wallet_balance <= 1, Active only)
        supabase
          .from('students')
          .select('student_id, name, wallet_balance')
          .eq('status', 'Active')
          .lte('wallet_balance', 1)
          .order('wallet_balance', { ascending: true })
          .limit(10),
        // Temporary stop count
        supabase
          .from('students')
          .select('student_id', { count: 'exact', head: true })
          .eq('status', 'Temporary Stop'),
        // Overdue follow-ups
        supabase
          .from('leads')
          .select('lead_id', { count: 'exact', head: true })
          .lte('next_followup_date', today)
          .neq('trial_status', 'Trial Booked')
          .neq('trial_status', 'Lost'),
        // Today's trials
        supabase
          .from('trial_students')
          .select('trial_id', { count: 'exact', head: true })
          .eq('trial_date', today),
      ]);

      return {
        todaysLessons: todaysLessonsResult.count || 0,
        todaysCompleted: todaysCompletedResult.count || 0,
        todaysAbsent: todaysAbsentResult.count || 0,
        todaysScheduled: todaysScheduledResult.count || 0,
        lowBalanceStudents: lowBalanceResult.data || [],
        temporaryStopStudents: tempStopResult.count || 0,
        overdueFollowups: overdueFollowupsResult.count || 0,
        todaysTrials: todaysTrialsResult.count || 0,
      };
    },
    refetchInterval: 30000,
  });
}
