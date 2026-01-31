import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LessonScheduleTemplate {
  schedule_id: string;
  package_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  time_slot: string; // HH:MM:SS format
  timezone: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function useLessonScheduleTemplate(studentId: string) {
  return useQuery({
    queryKey: ['lesson-schedule-template', studentId],
    queryFn: async () => {
      // Get active package for student
      const { data: activePackage, error: packageError } = await supabase
        .from('packages')
        .select('package_id, lesson_duration')
        .eq('student_id', studentId)
        .eq('status', 'Active')
        .maybeSingle();

      if (packageError) throw packageError;
      if (!activePackage) return null;

      // Get schedule template for this package
      const { data: schedules, error: scheduleError } = await supabase
        .from('lesson_schedules')
        .select('*')
        .eq('package_id', activePackage.package_id)
        .order('day_of_week', { ascending: true });

      if (scheduleError) throw scheduleError;

      return {
        lessonDuration: activePackage.lesson_duration,
        lessonsPerWeek: schedules?.length || 0,
        schedules: schedules?.map((s: LessonScheduleTemplate) => ({
          ...s,
          dayName: DAY_NAMES[s.day_of_week],
          formattedTime: formatTime(s.time_slot),
        })) || [],
      };
    },
    enabled: !!studentId,
  });
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}
