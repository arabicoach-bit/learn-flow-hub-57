import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';

export interface TeacherTrialLesson {
  trial_lesson_id: string;
  trial_student_id: string;
  student_name: string;
  lesson_date: string;
  lesson_time: string | null;
  duration_minutes: number;
  status: string;
  notes: string | null;
  teacher_payment_amount: number | null;
}

export function useTodaysTrialLessons() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  return useQuery({
    queryKey: ['teacher-todays-trial-lessons', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('trial_lessons_log')
        .select(`
          trial_lesson_id,
          trial_student_id,
          lesson_date,
          lesson_time,
          duration_minutes,
          status,
          notes,
          teacher_payment_amount,
          trial_students!inner(name)
        `)
        .eq('teacher_id', teacherId)
        .eq('lesson_date', today)
        .eq('status', 'scheduled')
        .order('lesson_time');

      if (error) throw error;

      return (data || []).map((lesson: any) => ({
        trial_lesson_id: lesson.trial_lesson_id,
        trial_student_id: lesson.trial_student_id,
        student_name: lesson.trial_students?.name || 'Unknown',
        lesson_date: lesson.lesson_date,
        lesson_time: lesson.lesson_time,
        duration_minutes: lesson.duration_minutes,
        status: lesson.status,
        notes: lesson.notes,
        teacher_payment_amount: lesson.teacher_payment_amount,
      })) as TeacherTrialLesson[];
    },
    enabled: !!teacherId,
    refetchInterval: 60000,
  });
}

export function usePendingTrialLessons() {
  const { profile } = useAuth();
  const teacherId = profile?.teacher_id;

  return useQuery({
    queryKey: ['teacher-pending-trial-lessons', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      
      const today = new Date();
      const sevenDaysAgo = subDays(today, 7);
      const todayStr = format(today, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('trial_lessons_log')
        .select(`
          trial_lesson_id,
          trial_student_id,
          lesson_date,
          lesson_time,
          duration_minutes,
          status,
          notes,
          teacher_payment_amount,
          trial_students!inner(name)
        `)
        .eq('teacher_id', teacherId)
        .eq('status', 'scheduled')
        .gte('lesson_date', format(sevenDaysAgo, 'yyyy-MM-dd'))
        .lt('lesson_date', todayStr)
        .order('lesson_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((lesson: any) => ({
        trial_lesson_id: lesson.trial_lesson_id,
        trial_student_id: lesson.trial_student_id,
        student_name: lesson.trial_students?.name || 'Unknown',
        lesson_date: lesson.lesson_date,
        lesson_time: lesson.lesson_time,
        duration_minutes: lesson.duration_minutes,
        status: lesson.status,
        notes: lesson.notes,
        teacher_payment_amount: lesson.teacher_payment_amount,
      })) as TeacherTrialLesson[];
    },
    enabled: !!teacherId,
    refetchInterval: 60000,
  });
}
