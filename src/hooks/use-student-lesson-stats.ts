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
}

/**
 * Single source of truth for student lesson statistics.
 * Used identically by Admin and Teacher views.
 *
 * When year + month are provided, stats are filtered to that period.
 * When startDate/endDate are null, returns all-time totals.
 * walletBalance always comes from the students table (unfiltered).
 */
export function useStudentLessonStats(
  studentId: string,
  startDate: string | null,
  endDate: string | null,
) {
  // Fetch ALL lessons for this student once (same query used by StudentLessonsView)
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

  // Fetch wallet from students table (single source of truth)
  const { data: student } = useQuery({
    queryKey: ['student-wallet', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('wallet_balance')
        .eq('student_id', studentId)
        .single();
      if (error) throw error;
      return data;
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

    return {
      completedCount,
      absentCount,
      scheduledCount,
      totalHours,
      walletBalance: student?.wallet_balance ?? 0,
    };
  }, [lessons, startDate, endDate, student]);

  return { stats, lessons, isLoading };
}
