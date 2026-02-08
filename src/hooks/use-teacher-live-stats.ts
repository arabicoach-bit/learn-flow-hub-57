import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, startOfMonth } from 'date-fns';

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

      // Fetch today's lessons, weekly scheduled lessons, and monthly lessons in parallel
      const [todayRes, weekRes, monthRes, teacherRes] = await Promise.all([
        // Today's scheduled lessons
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

        // This week's completed lessons (from lessons_log)
        supabase
          .from('scheduled_lessons')
          .select('scheduled_lesson_id, duration_minutes, status')
          .eq('teacher_id', teacherId)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd)
          .in('status', ['completed']),

        // This month's completed lessons (from lessons_log for salary calc)
        supabase
          .from('lessons_log')
          .select('lesson_id, status')
          .eq('teacher_id', teacherId)
          .eq('status', 'Taken')
          .gte('lesson_date', monthStart)
          .lte('lesson_date', today),

        // Get teacher rate
        supabase
          .from('teachers')
          .select('rate_per_lesson')
          .eq('teacher_id', teacherId)
          .single(),
      ]);

      // Also get scheduled lessons with duration for monthly hours
      const { data: monthScheduled } = await supabase
        .from('scheduled_lessons')
        .select('scheduled_lesson_id, duration_minutes')
        .eq('teacher_id', teacherId)
        .eq('status', 'completed')
        .gte('scheduled_date', monthStart)
        .lte('scheduled_date', today);

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
      const weeklyHours = weeklyLessons.reduce((sum, l) => sum + (l.duration_minutes || 45) / 60, 0);

      const monthlyLessonsCount = monthRes.data?.length || 0;
      const monthlyScheduled = monthScheduled || [];
      const monthlyHours = monthlyScheduled.reduce((sum, l) => sum + (l.duration_minutes || 45) / 60, 0);
      const rate = teacherRes.data?.rate_per_lesson || 0;
      const monthlySalary = monthlyHours * rate;

      return {
        todayLessons,
        weeklyHours: Math.round(weeklyHours * 100) / 100,
        weeklyLessonsCount: weeklyLessons.length,
        monthlySalary: Math.round(monthlySalary * 100) / 100,
        monthlyLessonsCount,
        monthlyHours: Math.round(monthlyHours * 100) / 100,
      };
    },
    enabled: !!teacherId,
    refetchInterval: 30000, // refresh every 30 seconds
  });
}
