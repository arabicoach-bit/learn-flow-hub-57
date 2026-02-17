import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TrialStatus = Database['public']['Enums']['trial_status'];
type TrialResult = Database['public']['Enums']['trial_result'];

export interface TrialStudent {
  trial_id: string;
  lead_id: string | null;
  name: string;
  parent_guardian_name: string | null;
  phone: string;
  age: number | null;
  gender: string | null;
  school: string | null;
  year_group: string | null;
  interested_program: string | null;
  student_level: string | null;
  teacher_id: string | null;
  trial_date: string | null;
  trial_time: string | null;
  duration_minutes: number;
  teacher_rate_per_lesson: number | null;
  teacher_pay_percentage: number;
  teacher_payment_amount: number | null;
  admin_payment_amount: number | null;
  status: TrialStatus;
  trial_result: TrialResult | null;
  notes: string | null;
  handled_by: string | null;
  follow_up_notes: string | null;
  converted_student_id: string | null;
  registration_date: string | null;
  created_at: string;
  updated_at: string;
  teachers?: { name: string; rate_per_lesson: number } | null;
}

export interface CreateTrialStudentInput {
  name: string;
  parent_guardian_name?: string;
  phone: string;
  age?: number;
  gender?: string;
  school?: string;
  year_group?: string;
  interested_program?: string;
  student_level?: string;
  teacher_id?: string;
  trial_date?: string;
  trial_time?: string;
  notes?: string;
  handled_by?: string;
}

export interface UpdateTrialStudentInput {
  trial_id: string;
  name?: string;
  parent_guardian_name?: string;
  phone?: string;
  age?: number;
  gender?: string;
  school?: string;
  year_group?: string;
  interested_program?: string;
  student_level?: string;
  teacher_id?: string;
  trial_date?: string;
  trial_time?: string;
  status?: TrialStatus;
  trial_result?: TrialResult;
  notes?: string;
  handled_by?: string;
  follow_up_notes?: string;
  converted_student_id?: string;
  registration_date?: string;
}

export function useTrialStudents(filters?: { status?: TrialStatus; teacher_id?: string; search?: string }) {
  return useQuery({
    queryKey: ['trial-students', filters],
    queryFn: async () => {
      let query = supabase
        .from('trial_students')
        .select('*, teachers(name, rate_per_lesson)')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.teacher_id) {
        query = query.eq('teacher_id', filters.teacher_id);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TrialStudent[];
    },
  });
}

export function useTrialStudent(trialId: string) {
  return useQuery({
    queryKey: ['trial-student', trialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trial_students')
        .select('*, teachers(name, rate_per_lesson)')
        .eq('trial_id', trialId)
        .maybeSingle();

      if (error) throw error;
      return data as TrialStudent | null;
    },
    enabled: !!trialId,
  });
}

export function useCreateTrialStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTrialStudentInput) => {
      // First get teacher rate if teacher is assigned
      let teacherPaymentAmount: number | null = null;
      let adminPaymentAmount: number | null = null;
      
      if (input.teacher_id) {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('rate_per_lesson')
          .eq('teacher_id', input.teacher_id)
          .single();
        
        if (teacher?.rate_per_lesson) {
          // 30 min = half hour, then split 50/50
          const halfHourRate = teacher.rate_per_lesson / 2;
          teacherPaymentAmount = halfHourRate * 0.5;
          adminPaymentAmount = halfHourRate * 0.5;
        }
      }

      const { data, error } = await supabase
        .from('trial_students')
        .insert({
          name: input.name,
          parent_guardian_name: input.parent_guardian_name || null,
          phone: input.phone,
          age: input.age || null,
          gender: input.gender || null,
          school: input.school || null,
          year_group: input.year_group || null,
          interested_program: input.interested_program || null,
          student_level: input.student_level || null,
          teacher_id: input.teacher_id || null,
          trial_date: input.trial_date || null,
          trial_time: input.trial_time || null,
          notes: input.notes || null,
          handled_by: input.handled_by || null,
          duration_minutes: 30,
          teacher_pay_percentage: 50,
          teacher_payment_amount: teacherPaymentAmount,
          admin_payment_amount: adminPaymentAmount,
          teacher_rate_per_lesson: null,
        })
        .select('*, teachers(name, rate_per_lesson)')
        .single();

      if (error) throw error;

      // Auto-create trial_lessons_log entry when teacher and date are assigned
      if (input.teacher_id && input.trial_date) {
        const { error: logError } = await supabase
          .from('trial_lessons_log')
          .insert({
            trial_student_id: data.trial_id,
            teacher_id: input.teacher_id,
            lesson_date: input.trial_date,
            lesson_time: input.trial_time || null,
            duration_minutes: 30,
            status: 'scheduled',
            teacher_payment_amount: teacherPaymentAmount,
            admin_payment_amount: adminPaymentAmount,
          });
        
        if (logError) {
          console.error('Failed to create trial lesson log:', logError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-students'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-all-trial-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-trial-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-pending-trial-lessons'] });
    },
  });
}

export function useUpdateTrialStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trial_id, ...data }: UpdateTrialStudentInput) => {
      const { error } = await supabase
        .from('trial_students')
        .update(data)
        .eq('trial_id', trial_id);

      if (error) throw error;

      // Sync trial_lessons_log if teacher/date/time changed
      if (data.teacher_id || data.trial_date || data.trial_time) {
        // Get the current trial student data to have full context
        const { data: trialStudent } = await supabase
          .from('trial_students')
          .select('teacher_id, trial_date, trial_time, duration_minutes')
          .eq('trial_id', trial_id)
          .single();

        if (trialStudent?.teacher_id && trialStudent?.trial_date) {
          // Check if a trial_lessons_log entry already exists
          const { data: existingLog } = await supabase
            .from('trial_lessons_log')
            .select('trial_lesson_id')
            .eq('trial_student_id', trial_id)
            .eq('status', 'scheduled')
            .maybeSingle();

          if (existingLog) {
            // Update existing entry
            await supabase
              .from('trial_lessons_log')
              .update({
                teacher_id: trialStudent.teacher_id,
                lesson_date: trialStudent.trial_date,
                lesson_time: trialStudent.trial_time,
              })
              .eq('trial_lesson_id', existingLog.trial_lesson_id);
          } else {
            // Check if ANY log exists (completed/cancelled) - don't create duplicate
            const { data: anyLog } = await supabase
              .from('trial_lessons_log')
              .select('trial_lesson_id')
              .eq('trial_student_id', trial_id)
              .maybeSingle();

            if (!anyLog) {
              // Get teacher rate for payment calculation
              let teacherPaymentAmount: number | null = null;
              let adminPaymentAmount: number | null = null;
              
              const { data: teacher } = await supabase
                .from('teachers')
                .select('rate_per_lesson')
                .eq('teacher_id', trialStudent.teacher_id)
                .single();
              
              if (teacher?.rate_per_lesson) {
                const halfHourRate = teacher.rate_per_lesson / 2;
                teacherPaymentAmount = halfHourRate * 0.5;
                adminPaymentAmount = halfHourRate * 0.5;
              }

              // Create new log entry
              await supabase
                .from('trial_lessons_log')
                .insert({
                  trial_student_id: trial_id,
                  teacher_id: trialStudent.teacher_id,
                  lesson_date: trialStudent.trial_date,
                  lesson_time: trialStudent.trial_time,
                  duration_minutes: 30,
                  status: 'scheduled',
                  teacher_payment_amount: teacherPaymentAmount,
                  admin_payment_amount: adminPaymentAmount,
                });
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-students'] });
      queryClient.invalidateQueries({ queryKey: ['trial-student'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-all-trial-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-trial-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-pending-trial-lessons'] });
    },
  });
}

export function useDeleteTrialStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trialId: string) => {
      const { error } = await supabase
        .from('trial_students')
        .delete()
        .eq('trial_id', trialId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial-students'] });
    },
  });
}
