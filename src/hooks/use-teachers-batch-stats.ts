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
      const [studentsRes, scheduledStudentsRes, lessonsRes, trialsRes, profilesRes, teachersRes] = await Promise.all([
        // 1. Students assigned via teacher_id
        supabase
          .from('students')
          .select('student_id, teacher_id, status')
          .in('teacher_id', teacherIds),

        // 1b. Students from scheduled_lessons (multi-teacher packages)
        supabase
          .from('scheduled_lessons')
          .select('student_id, teacher_id')
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

      // Build student status map from studentsRes
      const studentStatusMap = new Map<string, string>();
      studentsRes.data?.forEach((s: any) => {
        studentStatusMap.set(s.student_id, s.status);
      });

      // Build teacher -> unique student_ids (from teacher_id + scheduled_lessons)
      const teacherStudentSets: Record<string, Set<string>> = {};
      teacherIds.forEach(id => teacherStudentSets[id] = new Set());

      // From direct teacher_id assignment
      studentsRes.data?.forEach((s: any) => {
        if (s.teacher_id && teacherStudentSets[s.teacher_id]) {
          teacherStudentSets[s.teacher_id].add(s.student_id);
        }
      });

      // From scheduled_lessons (multi-teacher packages)
      scheduledStudentsRes.data?.forEach((sl: any) => {
        if (sl.teacher_id && sl.student_id && teacherStudentSets[sl.teacher_id]) {
          teacherStudentSets[sl.teacher_id].add(sl.student_id);
        }
      });

      // Fetch statuses for any students not in studentsRes (assigned to different primary teacher)
      const missingIds = new Set<string>();
      Object.values(teacherStudentSets).forEach(set => {
        set.forEach(sid => { if (!studentStatusMap.has(sid)) missingIds.add(sid); });
      });
      if (missingIds.size > 0) {
        const { data: extraStudents } = await supabase
          .from('students')
          .select('student_id, status')
          .in('student_id', Array.from(missingIds));
        extraStudents?.forEach((s: any) => studentStatusMap.set(s.student_id, s.status));
      }

      // Aggregate students per teacher
      teacherIds.forEach(tid => {
        teacherStudentSets[tid].forEach(sid => {
          const status = studentStatusMap.get(sid);
          if (status === 'Active') stats[tid].activeStudents += 1;
          else if (status === 'Temporary Stop') stats[tid].tempStopStudents += 1;
          else if (status === 'Left') stats[tid].leftStudents += 1;
        });
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
