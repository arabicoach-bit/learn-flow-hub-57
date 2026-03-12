import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentBatchStats {
  lessonsUsed: number;
  lessonsTotal: number;
  nextLessonDate: string | null;
  nextLessonTime: string | null;
  hasAnyPendingPackage: boolean;
}

/**
 * Batch-fetches lesson stats for a list of student IDs in 2 queries
 * instead of 2N individual queries (N+1 fix).
 */
export function useStudentsBatchStats(studentIds: string[]) {
  return useQuery({
    queryKey: ['students-batch-stats', studentIds.sort().join(',')],
    queryFn: async () => {
      if (studentIds.length === 0) return {} as Record<string, StudentBatchStats>;

      // 1. Get active packages for all students (include payment_status)
      const { data: packages } = await supabase
        .from('packages')
        .select('package_id, student_id, lessons_purchased, payment_status')
        .in('student_id', studentIds)
        .eq('status', 'Active')
        .order('created_at', { ascending: false });

      // Keep only latest active package per student + track pending status
      const studentPackageMap: Record<string, { package_id: string; lessons_purchased: number }> = {};
      const studentHasPending: Record<string, boolean> = {};
      (packages || []).forEach(p => {
        if (!studentPackageMap[p.student_id]) {
          studentPackageMap[p.student_id] = { package_id: p.package_id, lessons_purchased: p.lessons_purchased };
        }
        if (p.payment_status === 'Pending') {
          studentHasPending[p.student_id] = true;
        }
      });

      const packageIds = Object.values(studentPackageMap).map(p => p.package_id);

      // 2. Get all scheduled lessons for these packages + next scheduled per student
      const { data: lessons } = await supabase
        .from('scheduled_lessons')
        .select('scheduled_lesson_id, package_id, student_id, status, scheduled_date, scheduled_time')
        .in('student_id', studentIds)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      // Build stats per student
      const result: Record<string, StudentBatchStats> = {};

      studentIds.forEach(sid => {
        const pkg = studentPackageMap[sid];
        const studentLessons = (lessons || []).filter(l => l.student_id === sid);

        // Count used from active package
        let lessonsUsed = 0;
        if (pkg) {
          lessonsUsed = studentLessons.filter(
            l => l.package_id === pkg.package_id && (l.status === 'completed' || l.status === 'absent')
          ).length;
        }

        // Next scheduled lesson (any package)
        const nextScheduled = studentLessons.find(l => l.status === 'scheduled');

        result[sid] = {
          lessonsUsed,
          lessonsTotal: pkg?.lessons_purchased || 0,
          nextLessonDate: nextScheduled?.scheduled_date || null,
          nextLessonTime: nextScheduled?.scheduled_time || null,
          hasAnyPendingPackage: !!studentHasPending[sid],
        };
      });

      return result;
    },
    staleTime: 60_000,
    enabled: studentIds.length > 0,
  });
}
