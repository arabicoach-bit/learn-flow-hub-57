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
  status: 'scheduled' | 'completed' | 'absent';
  lesson_log_id: string | null;
  created_at: string;
  students?: { name: string; phone: string; status: string; wallet_balance: number } | null;
  teachers?: { name: string } | null;
  classes?: { name: string } | null;
}

export function useScheduledLessons(filters?: { 
  student_id?: string; 
  teacher_id?: string; 
  package_id?: string;
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
      if (filters?.package_id) {
        query = query.eq('package_id', filters.package_id);
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
      status: 'Taken' | 'Absent';
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
      const newStatus = status === 'Taken' ? 'completed' : 'absent';
      
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
      queryClient.invalidateQueries({ queryKey: ['teacher-monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-tomorrows-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-past-7-days-unmarked'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-live-stats'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCancelScheduledLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduledLessonId: string) => {
      const { error } = await supabase
        .from('scheduled_lessons')
        .update({ status: 'absent' })
        .eq('scheduled_lesson_id', scheduledLessonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-tomorrows-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-past-7-days-unmarked'] });
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
      // Simply update the lesson's date and time - just move it
      const { error: updateError } = await supabase
        .from('scheduled_lessons')
        .update({ 
          scheduled_date: newDate,
          scheduled_time: newTime,
          status: 'scheduled',
        })
        .eq('scheduled_lesson_id', scheduledLessonId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-tomorrows-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-past-7-days-unmarked'] });
    },
  });
}

export function useCheckLessonConflict() {
  return useMutation({
    mutationFn: async ({
      teacherId,
      date,
      time,
      excludeLessonId,
    }: {
      teacherId: string;
      date: string;
      time: string;
      excludeLessonId?: string;
    }) => {
      let query = supabase
        .from('scheduled_lessons')
        .select('scheduled_lesson_id, scheduled_time, students(name)')
        .eq('teacher_id', teacherId)
        .eq('scheduled_date', date)
        .eq('scheduled_time', time)
        .in('status', ['scheduled']);

      if (excludeLessonId) {
        query = query.neq('scheduled_lesson_id', excludeLessonId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        hasConflict: data && data.length > 0,
        conflicts: data,
      };
    },
  });
}

export function useUpdateScheduledLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scheduledLessonId,
      scheduled_date,
      scheduled_time,
      duration_minutes,
      status,
    }: {
      scheduledLessonId: string;
      scheduled_date?: string;
      scheduled_time?: string;
      duration_minutes?: number;
      status?: string;
    }) => {
      // Get current lesson to check status transition
      const { data: currentLesson } = await supabase
        .from('scheduled_lessons')
        .select('status, student_id')
        .eq('scheduled_lesson_id', scheduledLessonId)
        .single();

      const oldStatus = currentLesson?.status;
      const studentId = currentLesson?.student_id;

      const updateData: Record<string, unknown> = {};
      if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date;
      if (scheduled_time !== undefined) updateData.scheduled_time = scheduled_time;
      if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
      if (status !== undefined) updateData.status = status;

      const { error } = await supabase
        .from('scheduled_lessons')
        .update(updateData)
        .eq('scheduled_lesson_id', scheduledLessonId);

      if (error) throw error;

      // Handle wallet changes on status transitions (clamped to 0, debt tracking)
      if (status && oldStatus && status !== oldStatus && studentId) {
        const wasDeducted = oldStatus === 'completed';
        const shouldDeduct = status === 'completed';

        if (!wasDeducted && shouldDeduct) {
          // Transitioning to completed: deduct 1 (or increment debt if wallet is 0)
          const { data: student } = await supabase
            .from('students')
            .select('wallet_balance, debt_lessons')
            .eq('student_id', studentId)
            .single();
          if (student) {
            const wallet = student.wallet_balance || 0;
            const debt = (student as any).debt_lessons || 0;
            let newBalance: number, newDebt: number;
            if (wallet > 0) {
              newBalance = wallet - 1;
              newDebt = debt;
            } else {
              newBalance = 0;
              newDebt = debt + 1;
            }
            const newStatus = newBalance >= 3 ? 'Active' : newDebt >= 2 ? 'Blocked' : 'Grace';
            await supabase
              .from('students')
              .update({ wallet_balance: newBalance, debt_lessons: newDebt, status: newStatus })
              .eq('student_id', studentId);
          }
        } else if (wasDeducted && !shouldDeduct) {
          // Transitioning from completed -> scheduled/absent: refund 1 (reduce debt first, then add to wallet)
          const { data: student } = await supabase
            .from('students')
            .select('wallet_balance, debt_lessons')
            .eq('student_id', studentId)
            .single();
          if (student) {
            const wallet = student.wallet_balance || 0;
            const debt = (student as any).debt_lessons || 0;
            let newBalance: number, newDebt: number;
            if (debt > 0) {
              newDebt = debt - 1;
              newBalance = wallet;
            } else {
              newDebt = 0;
              newBalance = wallet + 1;
            }
            const newStatus = newBalance >= 3 ? 'Active' : newDebt >= 2 ? 'Blocked' : 'Grace';
            await supabase
              .from('students')
              .update({ wallet_balance: newBalance, debt_lessons: newDebt, status: newStatus })
              .eq('student_id', studentId);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-tomorrows-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-past-7-days-unmarked'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-live-stats'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-monthly-stats'] });
    },
  });
}

export function useAddScheduledLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      package_id: string;
      student_id: string;
      teacher_id: string;
      class_id?: string | null;
      scheduled_date: string;
      scheduled_time: string;
      duration_minutes: number;
    }) => {
      const { data, error } = await supabase
        .from('scheduled_lessons')
        .insert({
          package_id: input.package_id,
          student_id: input.student_id,
          teacher_id: input.teacher_id,
          class_id: input.class_id || null,
          scheduled_date: input.scheduled_date,
          scheduled_time: input.scheduled_time,
          duration_minutes: input.duration_minutes,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;

      // Adding individual lessons does NOT change wallet.
      // Wallet only changes via: packages (+N), completed (-1), delete scheduled (-1)
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-tomorrows-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-past-7-days-unmarked'] });
    },
  });
}

export function useDeleteScheduledLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduledLessonId }: { 
      scheduledLessonId: string; 
    }) => {
      // Get the lesson details before deleting
      const { data: lesson } = await supabase
        .from('scheduled_lessons')
        .select('student_id, status')
        .eq('scheduled_lesson_id', scheduledLessonId)
        .single();

      // Delete the lesson
      const { error } = await supabase
        .from('scheduled_lessons')
        .delete()
        .eq('scheduled_lesson_id', scheduledLessonId);

      if (error) throw error;

      // Wallet adjustments on delete (clamped to 0, debt tracking):
      // - 'scheduled': deduct 1 (removing a future lesson reduces wallet)
      // - 'completed': refund 1 (reduce debt first, then add to wallet)
      // - 'absent': no change
      if (lesson?.student_id && (lesson.status === 'scheduled' || lesson.status === 'completed')) {
        const { data: student } = await supabase
          .from('students')
          .select('wallet_balance, debt_lessons')
          .eq('student_id', lesson.student_id)
          .single();

        if (student) {
          const wallet = student.wallet_balance || 0;
          const debt = (student as any).debt_lessons || 0;
          let newBalance: number, newDebt: number;
          
          if (lesson.status === 'scheduled') {
            // Removing scheduled lesson: deduct 1 credit (clamp to 0)
            if (wallet > 0) {
              newBalance = wallet - 1;
              newDebt = debt;
            } else {
              newBalance = 0;
              newDebt = debt + 1;
            }
          } else {
            // Deleting completed: refund 1 (reduce debt first)
            if (debt > 0) {
              newDebt = debt - 1;
              newBalance = wallet;
            } else {
              newDebt = 0;
              newBalance = wallet + 1;
            }
          }
          
          const newStatus = newBalance >= 3 ? 'Active' : newDebt >= 2 ? 'Blocked' : 'Grace';
          await supabase
            .from('students')
            .update({ wallet_balance: newBalance, debt_lessons: newDebt, status: newStatus })
            .eq('student_id', lesson.student_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-tomorrows-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-past-7-days-unmarked'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
}
