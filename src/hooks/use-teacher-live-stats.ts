import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { fetchTeacherTotalHours } from '@/hooks/use-teacher-total-hours';

interface TodayLesson {
  scheduled_lesson_id: string;
  student_name: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  student_status: string | null;
  wallet_balance: number | null;
  program_name: string | null;
  student_level: string | null;
}

interface TeacherLiveStats {
  todayLessons: TodayLesson[];
  weeklyHours: number;
  weeklyLessonsCount: number;
  monthlySalary: number;
  monthlyLessonsCount: number;
  monthlyHours: number;
}

export function useTeacherLiveStats(teacherId: string) {
  return useQuery({
    queryKey: ['teacher-live-stats', teacherId],
    queryFn: async (): Promise<TeacherLiveStats> => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      // Fetch today's lessons and weekly lessons in parallel with shared hours calc
      const [todayRes, weekRes, monthlyStats] = await Promise.all([
        supabase
          .from('scheduled_lessons')
          .select(`
            scheduled_lesson_id,
            scheduled_time,
            duration_minutes,
            status,
            students!scheduled_lessons_student_id_fkey(name, status, wallet_balance, student_level, programs(name))
          `)
          .eq('teacher_id', teacherId)
          .eq('scheduled_date', today)
          .order('scheduled_time'),

        supabase
          .from('scheduled_lessons')
          .select('scheduled_lesson_id, duration_minutes, status')
          .eq('teacher_id', teacherId)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd)
          .eq('status', 'completed'),

        // Use shared calculation for monthly stats
        fetchTeacherTotalHours(teacherId, monthStart, monthEnd),
      ]);

      const todayLessons: TodayLesson[] = (todayRes.data || []).map((l: any) => ({
        scheduled_lesson_id: l.scheduled_lesson_id,
        student_name: l.students?.name || 'Unknown',
        scheduled_time: l.scheduled_time,
        duration_minutes: l.duration_minutes,
        status: l.status,
        student_status: l.students?.status || null,
        wallet_balance: l.students?.wallet_balance ?? null,
        program_name: l.students?.programs?.name || null,
        student_level: l.students?.student_level || null,
      }));

      const weeklyLessons = weekRes.data || [];
      const weeklyHours = weeklyLessons.reduce((sum, l) => sum + (l.duration_minutes || 0) / 60, 0);

      return {
        todayLessons,
        weeklyHours: Math.round(weeklyHours * 100) / 100,
        weeklyLessonsCount: weeklyLessons.length,
        monthlySalary: monthlyStats.salary,
        monthlyLessonsCount: monthlyStats.totalLessons,
        monthlyHours: monthlyStats.totalHours,
      };
    },
    enabled: !!teacherId,
    refetchInterval: 30000,
  });
}
