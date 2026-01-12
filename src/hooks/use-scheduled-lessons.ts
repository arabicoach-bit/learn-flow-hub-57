import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScheduledLesson {
  scheduled_lesson_id: string;
  package_id: string | null;
  student_id: string | null;
  teacher_id: string | null;
  class_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  lesson_log_id: string | null;
  created_at: string;
  students?: { name: string; phone: string; status: string; wallet_balance: number } | null;
  teachers?: { name: string } | null;
  classes?: { name: string } | null;
}

export function useScheduledLessons(filters?: { 
  student_id?: string; 
  teacher_id?: string; 
  date?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['scheduled-lessons', filters],
    queryFn: async () => {
      let query = supabase
        .from('scheduled_lessons')
        .select('*, students(name, phone, status, wallet_balance), teachers(name), classes(name)')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id);
      }
      if (filters?.teacher_id) {
        query = query.eq('teacher_id', filters.teacher_id);
      }
      if (filters?.date) {
        query = query.eq('scheduled_date', filters.date);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ScheduledLesson[];
    },
  });
}

export function useTodaysScheduledLessons(teacherId?: string) {
  const today = new Date().toISOString().split('T')[0];
  return useScheduledLessons({ 
    teacher_id: teacherId, 
    date: today,
    status: 'scheduled'
  });
}

export function useMarkScheduledLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      scheduledLessonId, 
      status,
      notes 
    }: { 
      scheduledLessonId: string; 
      status: 'Taken' | 'Absent' | 'Cancelled';
      notes?: string;
    }) => {
      // Get scheduled lesson details
      const { data: scheduledLesson, error: fetchError } = await supabase
        .from('scheduled_lessons')
        .select('*')
        .eq('scheduled_lesson_id', scheduledLessonId)
        .single();

      if (fetchError) throw fetchError;

      // Call mark_lesson_taken RPC
      const { data: result, error: rpcError } = await supabase.rpc('mark_lesson_taken', {
        p_student_id: scheduledLesson.student_id,
        p_class_id: scheduledLesson.class_id,
        p_teacher_id: scheduledLesson.teacher_id,
        p_status: status,
        p_notes: notes || null,
      });

      if (rpcError) throw rpcError;

      // Update scheduled lesson status
      const newStatus = status === 'Taken' ? 'completed' : 
                       status === 'Cancelled' ? 'cancelled' : 'completed';
      
      const { error: updateError } = await supabase
        .from('scheduled_lessons')
        .update({ status: newStatus })
        .eq('scheduled_lesson_id', scheduledLessonId);

      if (updateError) throw updateError;

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

export function useCancelScheduledLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduledLessonId: string) => {
      const { error } = await supabase
        .from('scheduled_lessons')
        .update({ status: 'cancelled' })
        .eq('scheduled_lesson_id', scheduledLessonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
    },
  });
}

export function useRescheduleLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      scheduledLessonId, 
      newDate, 
      newTime 
    }: { 
      scheduledLessonId: string; 
      newDate: string; 
      newTime: string;
    }) => {
      const { error } = await supabase
        .from('scheduled_lessons')
        .update({ 
          scheduled_date: newDate, 
          scheduled_time: newTime,
          status: 'rescheduled'
        })
        .eq('scheduled_lesson_id', scheduledLessonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
    },
  });
}
