import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeacherTotalHoursResult {
  regularLessons: number;
  trialLessons: number;
  totalLessons: number;
  regularHours: number;
  trialHours: number;
  totalHours: number;
  ratePerHour: number;
  salary: number;
}

/**
 * Single source of truth for teacher hours & salary calculation.
 *
 * Formula:
 *   regularHours = SUM(scheduled_lessons.duration_minutes WHERE completed) / 60
 *   trialHours   = COUNT(trial_lessons_log WHERE completed) × 0.5
 *   totalHours   = regularHours + trialHours
 *   salary       = totalHours × teacher.rate_per_lesson (hourly rate)
 */
export async function fetchTeacherTotalHours(
  teacherId: string,
  startDate: string | null,
  endDate: string | null,
): Promise<TeacherTotalHoursResult> {
  // 1. Get teacher rate
  const { data: teacher } = await supabase
    .from('teachers')
    .select('rate_per_lesson')
    .eq('teacher_id', teacherId)
    .single();

  const ratePerHour = teacher?.rate_per_lesson || 0;

  // 2. Regular completed lessons
  let lessonsQuery = supabase
    .from('scheduled_lessons')
    .select('scheduled_lesson_id, duration_minutes')
    .eq('teacher_id', teacherId)
    .eq('status', 'completed');

  if (startDate) lessonsQuery = lessonsQuery.gte('scheduled_date', startDate);
  if (endDate) lessonsQuery = lessonsQuery.lte('scheduled_date', endDate);

  const { data: completedLessons } = await lessonsQuery;

  // 3. Completed trial lessons
  let trialsQuery = supabase
    .from('trial_lessons_log')
    .select('trial_lesson_id')
    .eq('teacher_id', teacherId)
    .eq('status', 'completed');

  if (startDate) trialsQuery = trialsQuery.gte('lesson_date', startDate);
  if (endDate) trialsQuery = trialsQuery.lte('lesson_date', endDate);

  const { data: trialLessons } = await trialsQuery;

  // 4. Calculate
  const regularLessons = completedLessons?.length || 0;
  const trialLessonsCount = trialLessons?.length || 0;
  const regularHours = (completedLessons || []).reduce(
    (sum, l) => sum + (l.duration_minutes || 0) / 60,
    0,
  );
  const trialHours = trialLessonsCount * 0.5;
  const totalHours = regularHours + trialHours;
  const salary = totalHours * ratePerHour;

  return {
    regularLessons,
    trialLessons: trialLessonsCount,
    totalLessons: regularLessons + trialLessonsCount,
    regularHours,
    trialHours,
    totalHours,
    ratePerHour,
    salary: Math.round(salary * 100) / 100,
  };
}

/**
 * React hook wrapper – for a single teacher with date range.
 */
export function useTeacherTotalHours(
  teacherId: string | undefined,
  startDate: string | null,
  endDate: string | null,
) {
  return useQuery({
    queryKey: ['teacher-total-hours', teacherId, startDate, endDate],
    queryFn: () => fetchTeacherTotalHours(teacherId!, startDate, endDate),
    enabled: !!teacherId,
  });
}

/**
 * Batch fetch for multiple teachers (admin payroll page).
 */
export async function fetchAllTeachersTotalHours(
  teacherIds: string[],
  startDate: string | null,
  endDate: string | null,
): Promise<Record<string, TeacherTotalHoursResult>> {
  // Batch queries for all teachers at once
  let lessonsQuery = supabase
    .from('scheduled_lessons')
    .select('teacher_id, duration_minutes')
    .in('teacher_id', teacherIds)
    .eq('status', 'completed');

  if (startDate) lessonsQuery = lessonsQuery.gte('scheduled_date', startDate);
  if (endDate) lessonsQuery = lessonsQuery.lte('scheduled_date', endDate);

  let trialsQuery = supabase
    .from('trial_lessons_log')
    .select('teacher_id')
    .in('teacher_id', teacherIds)
    .eq('status', 'completed');

  if (startDate) trialsQuery = trialsQuery.gte('lesson_date', startDate);
  if (endDate) trialsQuery = trialsQuery.lte('lesson_date', endDate);

  const { data: teachersData } = await supabase
    .from('teachers')
    .select('teacher_id, rate_per_lesson')
    .in('teacher_id', teacherIds);

  const [lessonsRes, trialsRes] = await Promise.all([lessonsQuery, trialsQuery]);

  const rates: Record<string, number> = {};
  teachersData?.forEach((t) => {
    rates[t.teacher_id] = t.rate_per_lesson || 0;
  });

  // Aggregate per teacher
  const stats: Record<string, { regularMinutes: number; regularCount: number; trialCount: number }> = {};
  teacherIds.forEach((id) => {
    stats[id] = { regularMinutes: 0, regularCount: 0, trialCount: 0 };
  });

  lessonsRes.data?.forEach((l: any) => {
    if (l.teacher_id && stats[l.teacher_id]) {
      stats[l.teacher_id].regularCount += 1;
      stats[l.teacher_id].regularMinutes += l.duration_minutes || 0;
    }
  });

  trialsRes.data?.forEach((t: any) => {
    if (t.teacher_id && stats[t.teacher_id]) {
      stats[t.teacher_id].trialCount += 1;
    }
  });

  const results: Record<string, TeacherTotalHoursResult> = {};
  teacherIds.forEach((id) => {
    const s = stats[id];
    const regularHours = s.regularMinutes / 60;
    const trialHours = s.trialCount * 0.5;
    const totalHours = regularHours + trialHours;
    const rate = rates[id] || 0;

    results[id] = {
      regularLessons: s.regularCount,
      trialLessons: s.trialCount,
      totalLessons: s.regularCount + s.trialCount,
      regularHours,
      trialHours,
      totalHours,
      ratePerHour: rate,
      salary: Math.round(totalHours * rate * 100) / 100,
    };
  });

  return results;
}
