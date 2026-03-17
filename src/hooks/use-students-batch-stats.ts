import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentBatchStats {
  lessonsUsed: number;
  lessonsTotal: number;
  nextLessonDate: string | null;
  nextLessonTime: string | null;
  hasAnyPendingPackage: boolean;
  inProgressPackages: number;
  finishedPackages: number;
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

      // 1. Get all packages for all students (include payment_status and status)
      const { data: packages } = await supabase
        .from('packages')
        .select('package_id, student_id, lessons_purchased, payment_status, status')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      // Keep only latest active package per student + track pending status
      const studentPackageMap: Record<string, { package_id: string; lessons_purchased: number }> = {};
      const studentHasPending: Record<string, boolean> = {};
      const studentInProgress: Record<string, number> = {};
      const studentFinished: Record<string, number> = {};

      (packages || []).forEach(p => {
        // Track latest active package
        if (p.status === 'Active' && !studentPackageMap[p.student_id]) {
          studentPackageMap[p.student_id] = { package_id: p.package_id, lessons_purchased: p.lessons_purchased };
        }
        if (p.payment_status === 'Pending') {
          studentHasPending[p.student_id] = true;
        }
        // Count package statuses
        if (p.status === 'Active') {
          studentInProgress[p.student_id] = (studentInProgress[p.student_id] || 0) + 1;
        } else if (p.status === 'Completed') {
          studentFinished[p.student_id] = (studentFinished[p.student_id] || 0) + 1;
        }
      });

      // 2. Get all scheduled lessons for these students (paginated to avoid 1000-row limit)
      let allLessons: any[] = [];
      const pageSize = 1000;
      // Split student IDs into chunks for large IN clauses
      const idChunks: string[][] = [];
      for (let i = 0; i < studentIds.length; i += 500) {
        idChunks.push(studentIds.slice(i, i + 500));
      }
      for (const chunk of idChunks) {
        let from = 0;
        while (true) {
          const { data: lessons, error } = await supabase
            .from('scheduled_lessons')
            .select('scheduled_lesson_id, package_id, student_id, status, scheduled_date, scheduled_time')
            .in('student_id', chunk)
            .order('scheduled_date', { ascending: true })
            .order('scheduled_time', { ascending: true })
            .range(from, from + pageSize - 1);
          if (error) throw error;
          if (lessons) allLessons = allLessons.concat(lessons);
          if (!lessons || lessons.length < pageSize) break;
          from += pageSize;
        }
      }
      const lessons = allLessons;

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
          inProgressPackages: studentInProgress[sid] || 0,
          finishedPackages: studentFinished[sid] || 0,
        };
      });

      return result;
    },
    staleTime: 60_000,
    enabled: studentIds.length > 0,
  });
}

/**
 * Lightweight hook: for a list of student IDs, returns a map of studentId → hasAnyPendingPackage.
 * Used for stats cards where we need counts across ALL filtered students (not just visible page).
 */
export function useStudentsPaymentStats(studentIds: string[]) {
  return useQuery({
    queryKey: ['students-payment-stats', studentIds.sort().join(',')],
    queryFn: async () => {
      if (studentIds.length === 0) return {} as Record<string, boolean>;

      const { data: packages } = await supabase
        .from('packages')
        .select('student_id, payment_status')
        .in('student_id', studentIds);

      const result: Record<string, boolean> = {};
      (packages || []).forEach(p => {
        if (p.payment_status === 'Pending') {
          result[p.student_id] = true;
        }
      });
      return result;
    },
    staleTime: 60_000,
    enabled: studentIds.length > 0,
  });
}
