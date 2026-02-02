import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface TeacherLesson {
  scheduled_lesson_id: string;
  teacher_id: string;
  teacher_name: string;
  student_id: string;
  student_name: string;
  wallet_balance: number;
  student_status: string;
  scheduled_date?: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  program_name: string | null;
  student_level: string | null;
}

export interface TeacherMonthlyStats {
  teacher_id: string;
  teacher_name: string;
  rate_per_lesson: number;
  month: string;
  lessons_taught: number;
  total_hours: number;
  salary_earned: number;
}

export function useTodaysTeacherLessons() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  return useQuery({
    queryKey: ['teacher-todays-lessons', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const { data, error } = await supabase
        .from('scheduled_lessons')
        .select(`
          scheduled_lesson_id,
          teacher_id,
          student_id,
          scheduled_time,
          duration_minutes,
          status,
          students!inner(name, wallet_balance, status, student_level, program_id, programs(name))
        `)
        .eq('teacher_id', teacherId)
        .eq('scheduled_date', format(new Date(), 'yyyy-MM-dd'))
        .eq('status', 'scheduled')
        .order('scheduled_time');

      if (error) throw error;

      return (data || []).map((lesson: any) => ({
        scheduled_lesson_id: lesson.scheduled_lesson_id,
        teacher_id: lesson.teacher_id,
        student_id: lesson.student_id,
        student_name: lesson.students?.name || 'Unknown',
        wallet_balance: lesson.students?.wallet_balance || 0,
        student_status: lesson.students?.status || 'Active',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'), // Today's date
        scheduled_time: lesson.scheduled_time,
        duration_minutes: lesson.duration_minutes,
        status: lesson.status,
        program_name: lesson.students?.programs?.name || null,
        student_level: lesson.students?.student_level || null,
      })) as TeacherLesson[];
    },
    enabled: !!teacherId,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useTomorrowsTeacherLessons() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  return useQuery({
    queryKey: ['teacher-tomorrows-lessons', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data, error } = await supabase
        .from('scheduled_lessons')
        .select(`
          scheduled_lesson_id,
          teacher_id,
          student_id,
          scheduled_time,
          duration_minutes,
          status,
          students!inner(name, wallet_balance, status, student_level, program_id, programs(name))
        `)
        .eq('teacher_id', teacherId)
        .eq('scheduled_date', format(tomorrow, 'yyyy-MM-dd'))
        .eq('status', 'scheduled')
        .order('scheduled_time');

      if (error) throw error;

      return (data || []).map((lesson: any) => ({
        scheduled_lesson_id: lesson.scheduled_lesson_id,
        teacher_id: lesson.teacher_id,
        student_id: lesson.student_id,
        student_name: lesson.students?.name || 'Unknown',
        wallet_balance: lesson.students?.wallet_balance || 0,
        student_status: lesson.students?.status || 'Active',
        scheduled_date: format(tomorrow, 'yyyy-MM-dd'), // Tomorrow's date
        scheduled_time: lesson.scheduled_time,
        duration_minutes: lesson.duration_minutes,
        status: lesson.status,
        program_name: lesson.students?.programs?.name || null,
        student_level: lesson.students?.student_level || null,
      })) as TeacherLesson[];
    },
    enabled: !!teacherId,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

export function useWeekTeacherLessons() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  return useQuery({
    queryKey: ['teacher-week-lessons', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const today = new Date();
      const weekEnd = new Date();
      weekEnd.setDate(today.getDate() + 7);
      
      const { data, error } = await supabase
        .from('scheduled_lessons')
        .select(`
          scheduled_lesson_id,
          teacher_id,
          student_id,
          scheduled_date,
          scheduled_time,
          duration_minutes,
          status,
          students!inner(name, wallet_balance, status, student_level, program_id, programs(name))
        `)
        .eq('teacher_id', teacherId)
        .gte('scheduled_date', format(today, 'yyyy-MM-dd'))
        .lt('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .eq('status', 'scheduled')
        .order('scheduled_date')
        .order('scheduled_time');

      if (error) throw error;

      return (data || []).map((lesson: any) => ({
        scheduled_lesson_id: lesson.scheduled_lesson_id,
        teacher_id: lesson.teacher_id,
        student_id: lesson.student_id,
        student_name: lesson.students?.name || 'Unknown',
        wallet_balance: lesson.students?.wallet_balance || 0,
        student_status: lesson.students?.status || 'Active',
        scheduled_date: lesson.scheduled_date,
        scheduled_time: lesson.scheduled_time,
        duration_minutes: lesson.duration_minutes,
        status: lesson.status,
        program_name: lesson.students?.programs?.name || null,
        student_level: lesson.students?.student_level || null,
      })) as (TeacherLesson & { scheduled_date: string })[];
    },
    enabled: !!teacherId,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

export function useTeacherMonthlyStats() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  return useQuery({
    queryKey: ['teacher-monthly-stats', teacherId],
    queryFn: async () => {
      if (!teacherId) return { currentMonth: null, lastMonth: null };

      const now = new Date();
      const currentMonthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const currentMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
      
      const lastMonthDate = subMonths(now, 1);
      const lastMonthStart = format(startOfMonth(lastMonthDate), 'yyyy-MM-dd');
      const lastMonthEnd = format(endOfMonth(lastMonthDate), 'yyyy-MM-dd');

      // Get teacher rate (this is now hourly rate)
      const { data: teacher } = await supabase
        .from('teachers')
        .select('rate_per_lesson, name')
        .eq('teacher_id', teacherId)
        .single();

      const ratePerHour = teacher?.rate_per_lesson || 0;

      // Get current month lessons with duration from scheduled_lessons
      const { data: currentMonthLessons } = await supabase
        .from('lessons_log')
        .select(`
          lesson_id,
          scheduled_lessons!inner(duration_minutes)
        `)
        .eq('teacher_id', teacherId)
        .eq('status', 'Taken')
        .gte('lesson_date', currentMonthStart)
        .lte('lesson_date', currentMonthEnd);

      // Get last month lessons with duration
      const { data: lastMonthLessons } = await supabase
        .from('lessons_log')
        .select(`
          lesson_id,
          scheduled_lessons!inner(duration_minutes)
        `)
        .eq('teacher_id', teacherId)
        .eq('status', 'Taken')
        .gte('lesson_date', lastMonthStart)
        .lte('lesson_date', lastMonthEnd);

      // Calculate hours from actual lesson durations
      const currentHours = (currentMonthLessons || []).reduce((total, lesson: any) => {
        const duration = lesson.scheduled_lessons?.[0]?.duration_minutes || 45;
        return total + duration / 60;
      }, 0);

      const lastHours = (lastMonthLessons || []).reduce((total, lesson: any) => {
        const duration = lesson.scheduled_lessons?.[0]?.duration_minutes || 45;
        return total + duration / 60;
      }, 0);

      const currentLessonsCount = currentMonthLessons?.length || 0;
      const lastLessonsCount = lastMonthLessons?.length || 0;

      return {
        currentMonth: {
          teacher_id: teacherId,
          teacher_name: teacher?.name || 'Unknown',
          rate_per_lesson: ratePerHour, // This is now hourly rate
          month: format(now, 'MMMM yyyy'),
          lessons_taught: currentLessonsCount,
          total_hours: currentHours,
          salary_earned: currentHours * ratePerHour, // Pay based on hours
        },
        lastMonth: {
          teacher_id: teacherId,
          teacher_name: teacher?.name || 'Unknown',
          rate_per_lesson: ratePerHour,
          month: format(lastMonthDate, 'MMMM yyyy'),
          lessons_taught: lastLessonsCount,
          total_hours: lastHours,
          salary_earned: lastHours * ratePerHour, // Pay based on hours
        },
      };
    },
    enabled: !!teacherId,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });
}

export function useTeacherStudents() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  return useQuery({
    queryKey: ['teacher-students', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const { data, error } = await supabase
        .from('students')
        .select('*, programs(name)')
        .eq('teacher_id', teacherId)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!teacherId,
  });
}
