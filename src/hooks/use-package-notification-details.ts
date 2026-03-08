import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PackageNotificationDetails {
  package_id: string;
  lessons_purchased: number;
  lessons_used: number | null;
  lesson_duration: number | null;
  start_date: string | null;
  description: string | null;
  is_renewal: boolean | null;
  status: string | null;
  package_type_name: string | null;
  lessons_per_week: number | null;
  schedule: { day_of_week: number; time_slot: string }[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatSchedule(schedule: { day_of_week: number; time_slot: string }[]): string {
  if (!schedule || schedule.length === 0) return '';
  return schedule
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map(s => `${DAY_NAMES[s.day_of_week]} ${s.time_slot.slice(0, 5)}`)
    .join(', ');
}

export function usePackageNotificationDetails(
  studentId: string | null,
  notificationType: string,
  createdAt: string
) {
  return useQuery({
    queryKey: ['package-notification-details', studentId, createdAt],
    queryFn: async (): Promise<PackageNotificationDetails | null> => {
      if (!studentId) return null;

      // Find the package created closest to (and before/at) the notification time
      const { data: pkg, error } = await supabase
        .from('packages')
        .select('package_id, lessons_purchased, lessons_used, lesson_duration, start_date, description, is_renewal, status, package_type_id')
        .eq('student_id', studentId)
        .lte('created_at', new Date(new Date(createdAt).getTime() + 60000).toISOString()) // within 1 min
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !pkg) return null;

      // Fetch package type name
      let packageTypeName: string | null = null;
      let lessonsPerWeek: number | null = null;
      if (pkg.package_type_id) {
        const { data: pt } = await supabase
          .from('package_types')
          .select('name, lessons_per_week')
          .eq('package_type_id', pkg.package_type_id)
          .maybeSingle();
        packageTypeName = pt?.name || null;
        lessonsPerWeek = pt?.lessons_per_week || null;
      }

      // Fetch schedule
      const { data: schedules } = await supabase
        .from('lesson_schedules')
        .select('day_of_week, time_slot')
        .eq('package_id', pkg.package_id);

      return {
        package_id: pkg.package_id,
        lessons_purchased: pkg.lessons_purchased,
        lessons_used: pkg.lessons_used,
        lesson_duration: pkg.lesson_duration,
        start_date: pkg.start_date,
        description: pkg.description,
        is_renewal: pkg.is_renewal,
        status: pkg.status,
        package_type_name: packageTypeName,
        lessons_per_week: lessonsPerWeek,
        schedule: schedules || [],
      };
    },
    enabled: notificationType === 'new_package' && !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}
