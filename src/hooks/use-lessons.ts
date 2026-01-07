import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LessonLog {
  lesson_id: string;
  date: string;
  lesson_date: string;
  class_id: string | null;
  teacher_id: string | null;
  student_id: string | null;
  status: 'Taken' | 'Absent' | 'Cancelled';
  package_id_used: string | null;
  notes: string | null;
  created_at: string;
  students?: { name: string } | null;
  classes?: { name: string } | null;
  teachers?: { name: string } | null;
}

export interface MarkLessonInput {
  student_id: string;
  class_id: string;
  teacher_id: string;
  status: 'Taken' | 'Absent' | 'Cancelled';
  notes?: string;
}

export function useLessons(filters?: { date?: string; teacher_id?: string; student_id?: string }) {
  return useQuery({
    queryKey: ['lessons', filters],
    queryFn: async () => {
      let query = supabase
        .from('lessons_log')
        .select('*, students(name), classes(name), teachers(name)')
        .order('date', { ascending: false });

      if (filters?.date) {
        const startOfDay = new Date(filters.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.date);
        endOfDay.setHours(23, 59, 59, 999);
        query = query
          .gte('date', startOfDay.toISOString())
          .lte('date', endOfDay.toISOString());
      }
      if (filters?.teacher_id) {
        query = query.eq('teacher_id', filters.teacher_id);
      }
      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as LessonLog[];
    },
  });
}

export function useTodaysLessons() {
  const today = new Date().toISOString().split('T')[0];
  return useLessons({ date: today });
}

export function useMarkLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MarkLessonInput) => {
      const { data, error } = await supabase.rpc('mark_lesson_taken', {
        p_student_id: input.student_id,
        p_class_id: input.class_id,
        p_teacher_id: input.teacher_id,
        p_status: input.status,
        p_notes: input.notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
