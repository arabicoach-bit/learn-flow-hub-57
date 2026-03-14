import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScheduledLesson {
  scheduled_lesson_id: string;
  package_id: string | null;
  student_id: string | null;
  teacher_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'absent';
  lesson_log_id: string | null;
  created_at: string;
  notes?: string | null;
  wallet_deducted?: boolean;
  wallet_deducted_at?: string | null;
  students?: { name: string; phone: string; status: string; wallet_balance: number } | null;
  teachers?: { name: string } | null;
}

/** Standard query keys to invalidate after any lesson status change */
const LESSON_INVALIDATION_KEYS = [
  'scheduled-lessons',
  'students',
  'student-wallet',
  'student-all-lessons',
  'lessons',
  'teacher-monthly-stats',
  'teacher-todays-lessons',
  'teacher-tomorrows-lessons',
  'teacher-week-lessons',
  'teacher-past-7-days-unmarked',
  'teacher-live-stats',
  'teacher-students',
  'dashboard-stats',
  'admin-dashboard-stats',
  'admin-payroll-unified',
  'admin-teacher-today-lessons',
  'packages',
  'notifications',
  'notifications-unread-count',
] as const;

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  LESSON_INVALIDATION_KEYS.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
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
        .select('*, students(name, phone, status, wallet_balance), teachers(name)')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (filters?.student_id) query = query.eq('student_id', filters.student_id);
      if (filters?.teacher_id) query = query.eq('teacher_id', filters.teacher_id);
      if (filters?.package_id) query = query.eq('package_id', filters.package_id);
      if (filters?.date) query = query.eq('scheduled_date', filters.date);
      if (filters?.status) query = query.eq('status', filters.status);

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

/**
 * UNIFIED lesson marking hook — single entry point for all status changes.
 *
 * Flow:
 * 1. Update scheduled_lesson status → DB trigger handles wallet deduction/restoration atomically
 * 2. Call mark_lesson_taken RPC → handles notifications + package tracking (no wallet logic)
 *
 * This ensures wallet is ALWAYS in sync regardless of where the status change originates.
 */
export function useMarkScheduledLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      scheduledLessonId, 
      status,
      notes 
    }: { 
      scheduledLessonId: string; 
      status: 'completed' | 'absent';
      notes?: string;
    }) => {
      // Step 1: Get lesson details
      const { data: lesson, error: fetchError } = await supabase
        .from('scheduled_lessons')
        .select('*')
        .eq('scheduled_lesson_id', scheduledLessonId)
        .single();

      if (fetchError) throw fetchError;

      // Step 2: UPDATE STATUS FIRST — this fires the DB trigger which handles wallet atomically
      const updateData: Record<string, unknown> = { status };
      if (notes !== undefined) updateData.notes = notes;

      const { error: updateError } = await supabase
        .from('scheduled_lessons')
        .update(updateData)
        .eq('scheduled_lesson_id', scheduledLessonId);

      if (updateError) throw updateError;

      // Step 3: Call RPC for notifications + package tracking (wallet already handled by trigger)
      const { data: result, error: rpcError } = await supabase.rpc('mark_lesson_taken', {
        p_student_id: lesson.student_id,
        p_teacher_id: lesson.teacher_id,
        p_status: status,
        p_notes: notes || null,
      });

      if (rpcError) throw rpcError;

      return result;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

/**
 * Update lesson details (date, time, duration, status).
 * When status changes to completed/absent, the DB trigger handles wallet.
 * RPC is called for notifications when transitioning to completed/absent.
 */
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
      // Get current lesson for context
      const { data: currentLesson, error: currentLessonError } = await supabase
        .from('scheduled_lessons')
        .select('student_id, teacher_id, status, notes')
        .eq('scheduled_lesson_id', scheduledLessonId)
        .single();

      if (currentLessonError) throw currentLessonError;

      // Build update payload
      const updateData: Record<string, unknown> = {};
      if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date;
      if (scheduled_time !== undefined) updateData.scheduled_time = scheduled_time;
      if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
      if (status !== undefined) updateData.status = status;

      // Update the lesson — DB trigger handles wallet if status changed
      const { error } = await supabase
        .from('scheduled_lessons')
        .update(updateData)
        .eq('scheduled_lesson_id', scheduledLessonId);

      if (error) throw error;

      // Call RPC for notifications when marking completed/absent from scheduled
      if (
        status &&
        ['completed', 'absent'].includes(status) &&
        currentLesson?.status === 'scheduled' &&
        currentLesson.status !== status
      ) {
        if (currentLesson.student_id && currentLesson.teacher_id) {
          await supabase.rpc('mark_lesson_taken', {
            p_student_id: currentLesson.student_id,
            p_teacher_id: currentLesson.teacher_id,
            p_status: status,
            p_notes: currentLesson.notes || null,
          });
        }
      }
    },
    onSuccess: () => invalidateAll(queryClient),
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

export function useAddScheduledLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      package_id: string;
      student_id: string;
      teacher_id: string;
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
          scheduled_date: input.scheduled_date,
          scheduled_time: input.scheduled_time,
          duration_minutes: input.duration_minutes,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;

      // Increment lessons_purchased on the package (adding a lesson increases total)
      const { data: pkg } = await supabase
        .from('packages')
        .select('lessons_purchased')
        .eq('package_id', input.package_id)
        .single();

      if (pkg) {
        await supabase
          .from('packages')
          .update({ lessons_purchased: pkg.lessons_purchased + 1 })
          .eq('package_id', input.package_id);
      }

      // Recalculate wallet
      await supabase.rpc('recalculate_student_wallet', { p_student_id: input.student_id });

      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteScheduledLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scheduledLessonId }: { scheduledLessonId: string }) => {
      // Get lesson details before deleting
      const { data: lesson } = await supabase
        .from('scheduled_lessons')
        .select('student_id, wallet_deducted')
        .eq('scheduled_lesson_id', scheduledLessonId)
        .single();

      // Delete the lesson
      const { error } = await supabase
        .from('scheduled_lessons')
        .delete()
        .eq('scheduled_lesson_id', scheduledLessonId);

      if (error) throw error;

      // Recalculate wallet after delete
      if (lesson?.student_id) {
        await supabase.rpc('recalculate_student_wallet', { p_student_id: lesson.student_id });
      }
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

// Legacy export kept for backward compatibility — just uses useMarkScheduledLesson internally
export function useMarkScheduledLessonAbsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduledLessonId: string) => {
      const { data: lesson } = await supabase
        .from('scheduled_lessons')
        .select('student_id, teacher_id, notes')
        .eq('scheduled_lesson_id', scheduledLessonId)
        .single();

      // Update status — trigger handles wallet
      const { error } = await supabase
        .from('scheduled_lessons')
        .update({ status: 'absent' })
        .eq('scheduled_lesson_id', scheduledLessonId);

      if (error) throw error;

      // Call RPC for notifications
      if (lesson?.student_id && lesson?.teacher_id) {
        await supabase.rpc('mark_lesson_taken', {
          p_student_id: lesson.student_id,
          p_teacher_id: lesson.teacher_id,
          p_status: 'absent',
          p_notes: lesson.notes || null,
        });
      }
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}
