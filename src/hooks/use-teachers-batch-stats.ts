import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface TeacherBatchStats {
  activeStudents: number;
  tempStopStudents: number;
  leftStudents: number;
  monthlyHours: number;
  monthlySalary: number;
  monthlyLessons: number;
  trialLessons: number;
  lastLogin: string | null;
}

export function useTeachersBatchStats(teacherIds: string[]) {
  return useQuery({
    queryKey: ['teachers-batch-stats', teacherIds.sort().join(',')],
    queryFn: async () => {
      if (teacherIds.length === 0) return {} as Record<string, TeacherBatchStats>;

      const now = new Date();
      const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

      // Batch all queries in parallel
      const [studentsRes, lessonsRes, trialsRes, profilesRes, teachersRes] = await Promise.all([
        // 1. Students per teacher
        supabase
          .from('students')
          .select('student_id, teacher_id, status')
          .in('teacher_id', teacherIds),

        // 2. Completed lessons this month
        supabase
          .from('scheduled_lessons')
          .select('teacher_id, duration_minutes, status')
          .in('teacher_id', teacherIds)
          .eq('status', 'completed')
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate),

        // 3. Trial lessons this month
        supabase
          .from('trial_lessons_log')
          .select('teacher_id')
          .in('teacher_id', teacherIds)
          .eq('status', 'completed')
          .gte('lesson_date', startDate)
          .lte('lesson_date', endDate),

        // 4. Last login from profiles
        supabase
          .from('profiles')
          .select('teacher_id, last_login')
          .in('teacher_id', teacherIds),

        // 5. Teacher rates
        supabase
          .from('teachers')
          .select('teacher_id, rate_per_lesson')
          .in('teacher_id', teacherIds),
      ]);

      // Build rates map
      const rates: Record<string, number> = {};
      teachersRes.data?.forEach((t) => {
        rates[t.teacher_id] = t.rate_per_lesson || 0;
      });

      // Initialize stats
      const stats: Record<string, TeacherBatchStats> = {};
      teacherIds.forEach((id) => {
        stats[id] = {
          activeStudents: 0,
          tempStopStudents: 0,
          leftStudents: 0,
          monthlyHours: 0,
          monthlySalary: 0,
          monthlyLessons: 0,
          trialLessons: 0,
          lastLogin: null,
        };
      });

      // Aggregate students
      studentsRes.data?.forEach((s: any) => {
        if (s.teacher_id && stats[s.teacher_id]) {
          if (s.status === 'Active') stats[s.teacher_id].activeStudents += 1;
          else if (s.status === 'Temporary Stop') stats[s.teacher_id].tempStopStudents += 1;
          else if (s.status === 'Left') stats[s.teacher_id].leftStudents += 1;
        }
      });

      // Aggregate lessons
      lessonsRes.data?.forEach((l: any) => {
        if (l.teacher_id && stats[l.teacher_id]) {
          stats[l.teacher_id].monthlyLessons += 1;
          stats[l.teacher_id].monthlyHours += (l.duration_minutes || 0) / 60;
        }
      });

      // Aggregate trials
      trialsRes.data?.forEach((t: any) => {
        if (t.teacher_id && stats[t.teacher_id]) {
          stats[t.teacher_id].trialLessons += 1;
        }
      });

      // Last login
      profilesRes.data?.forEach((p: any) => {
        if (p.teacher_id && stats[p.teacher_id]) {
          stats[p.teacher_id].lastLogin = p.last_login;
        }
      });

      // Calculate salary (regular hours + trial hours × 0.5 each) × rate
      teacherIds.forEach((id) => {
        const s = stats[id];
        const trialHours = s.trialLessons * 0.5;
        const totalHours = s.monthlyHours + trialHours;
        s.monthlySalary = Math.round(totalHours * (rates[id] || 0) * 100) / 100;
      });

      return stats;
    },
    enabled: teacherIds.length > 0,
  });
}
