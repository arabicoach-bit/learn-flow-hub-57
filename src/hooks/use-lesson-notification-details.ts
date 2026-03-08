import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LessonNotificationDetails {
  scheduled_time: string;
  duration_minutes: number;
  scheduled_date: string;
  notes: string | null;
  teacher_name: string | null;
}

export function useLessonNotificationDetails(
  studentId: string | null,
  notificationType: string,
  createdAt: string
) {
  return useQuery({
    queryKey: ['lesson-notification-details', studentId, createdAt],
    queryFn: async (): Promise<LessonNotificationDetails | null> => {
      if (!studentId) return null;

      // Find the completed lesson closest to notification time
      const notifTime = new Date(createdAt);
      const windowStart = new Date(notifTime.getTime() - 5 * 60000).toISOString();
      const windowEnd = new Date(notifTime.getTime() + 5 * 60000).toISOString();

      const { data, error } = await supabase
        .from('scheduled_lessons')
        .select('scheduled_time, duration_minutes, scheduled_date, notes, teacher_id')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .gte('created_at', windowStart)
        .lte('created_at', windowEnd)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        // Fallback: find most recent completed lesson before notification
        const { data: fallback } = await supabase
          .from('scheduled_lessons')
          .select('scheduled_time, duration_minutes, scheduled_date, notes, teacher_id')
          .eq('student_id', studentId)
          .eq('status', 'completed')
          .lte('scheduled_date', notifTime.toISOString().split('T')[0])
          .order('scheduled_date', { ascending: false })
          .order('scheduled_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!fallback) return null;

        let teacherName: string | null = null;
        if (fallback.teacher_id) {
          const { data: t } = await supabase
            .from('teachers')
            .select('name')
            .eq('teacher_id', fallback.teacher_id)
            .maybeSingle();
          teacherName = t?.name || null;
        }

        return {
          scheduled_time: fallback.scheduled_time,
          duration_minutes: fallback.duration_minutes,
          scheduled_date: fallback.scheduled_date,
          notes: fallback.notes,
          teacher_name: teacherName,
        };
      }

      let teacherName: string | null = null;
      if (data.teacher_id) {
        const { data: t } = await supabase
          .from('teachers')
          .select('name')
          .eq('teacher_id', data.teacher_id)
          .maybeSingle();
        teacherName = t?.name || null;
      }

      return {
        scheduled_time: data.scheduled_time,
        duration_minutes: data.duration_minutes,
        scheduled_date: data.scheduled_date,
        notes: data.notes,
        teacher_name: teacherName,
      };
    },
    enabled: notificationType === 'lesson_completed' && !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}
