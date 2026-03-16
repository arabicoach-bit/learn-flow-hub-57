import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ScheduledLesson } from './use-scheduled-lessons';

interface StudentLessonStats {
  completedCount: number;
  absentCount: number;
  scheduledCount: number;
  totalHours: number;
  walletBalance: number;
  /** Active package: used/total for the "Lessons" display */
  activePackageLessonsUsed: number;
  activePackageLessonsTotal: number;
}

/**
 * Single source of truth for student lesson statistics.
 * Used identically by Admin and Teacher views.
 *
 * Wallet = remaining lessons in active package(s) = lessons_purchased - (completed + absent)
 * Lessons display = used / total for active package
 * walletBalance always comes from the students table (updated by DB trigger).
 */
export function useStudentLessonStats(
  studentId: string,
  startDate: string | null,
  endDate: string | null,
) {
  // Fetch ALL lessons for this student once
  const { data: lessons, isLoading } = useQuery({
    queryKey: ['student-all-lessons', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_lessons')
        .select('*, teachers(name)')
        .eq('student_id', studentId)
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });
      if (error) throw error;
      return (data || []) as ScheduledLesson[];
    },
  });

  // Fetch wallet + current_package_id from students table
  const { data: student } = useQuery({
    queryKey: ['student-wallet', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('wallet_balance, current_package_id')
        .eq('student_id', studentId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch active packages for this student (for Lessons display)
  const { data: activePackages } = useQuery({
    queryKey: ['student-active-packages', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('package_id, lessons_purchased')
        .eq('student_id', studentId)
        .eq('status', 'Active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const stats: StudentLessonStats = useMemo(() => {
    const filtered = (lessons || []).filter((l) => {
      if (!startDate || !endDate) return true;
      return l.scheduled_date >= startDate && l.scheduled_date <= endDate;
    });

    const completedCount = filtered.filter((l) => l.status === 'completed').length;
    const absentCount = filtered.filter((l) => l.status === 'absent').length;
    const scheduledCount = filtered.filter((l) => l.status === 'scheduled').length;
    const totalHours = filtered
      .filter((l) => l.status === 'completed')
      .reduce((sum, l) => sum + (l.duration_minutes || 45) / 60, 0);

    // Calculate active package lessons: used/total
    const activePackageIds = new Set((activePackages || []).map(p => p.package_id));
    const activePackageLessonsTotal = (activePackages || []).reduce((sum, p) => sum + p.lessons_purchased, 0);
    const activePackageLessonsUsed = (lessons || []).filter(
      l => l.package_id && activePackageIds.has(l.package_id) && (l.status === 'completed' || l.status === 'absent')
    ).length;

    return {
      completedCount,
      absentCount,
      scheduledCount,
      totalHours,
      // Wallet = count of scheduled lessons across active packages (matches DB logic)
      walletBalance: (lessons || []).filter(
        l => l.package_id && activePackageIds.has(l.package_id) && l.status === 'scheduled'
      ).length,
      activePackageLessonsUsed,
      activePackageLessonsTotal,
    };
  }, [lessons, startDate, endDate, student, activePackages]);

  return { stats, lessons, isLoading };
}
