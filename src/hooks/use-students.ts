import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Student {
  student_id: string;
  name: string;
  phone: string;
  parent_phone: string | null;
  class_id: string | null;
  teacher_id: string | null;
  status: 'Active' | 'Grace' | 'Blocked';
  wallet_balance: number;
  current_package_id: string | null;
  created_at: string;
  updated_at: string;
  classes?: { name: string } | null;
  teachers?: { name: string } | null;
}

export interface CreateStudentInput {
  name: string;
  phone: string;
  parent_phone?: string;
  class_id?: string;
  teacher_id?: string;
  initial_amount?: number;
  initial_lessons?: number;
}

export function useStudents(filters?: { status?: string; teacher_id?: string; class_id?: string; search?: string }) {
  return useQuery({
    queryKey: ['students', filters],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('*, classes(name), teachers(name)')
        .order('created_at', { ascending: false });

      if (filters?.status && ['Active', 'Grace', 'Blocked'].includes(filters.status)) {
        query = query.eq('status', filters.status as 'Active' | 'Grace' | 'Blocked');
      }
      if (filters?.teacher_id) {
        query = query.eq('teacher_id', filters.teacher_id);
      }
      if (filters?.class_id) {
        query = query.eq('class_id', filters.class_id);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Student[];
    },
  });
}

export function useStudent(studentId: string) {
  return useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, classes(name), teachers(name)')
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;
      return data as Student | null;
    },
    enabled: !!studentId,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStudentInput) => {
      // Create the student first
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          name: input.name,
          phone: input.phone,
          parent_phone: input.parent_phone || null,
          class_id: input.class_id || null,
          teacher_id: input.teacher_id || null,
          wallet_balance: input.initial_lessons || 0,
          status: (input.initial_lessons || 0) > 0 ? 'Active' : 'Grace',
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // If initial lessons provided, create a package
      if (input.initial_lessons && input.initial_lessons > 0 && input.initial_amount) {
        const { data: packageData, error: packageError } = await supabase
          .from('packages')
          .insert({
            student_id: student.student_id,
            amount: input.initial_amount,
            lessons_purchased: input.initial_lessons,
            lessons_used: 0,
          })
          .select()
          .single();

        if (packageError) throw packageError;

        // Update student with package reference
        await supabase
          .from('students')
          .update({ current_package_id: packageData.package_id })
          .eq('student_id', student.student_id);
      }

      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, ...data }: { studentId: string; name?: string; phone?: string; parent_phone?: string; class_id?: string; teacher_id?: string }) => {
      const { error } = await supabase
        .from('students')
        .update(data)
        .eq('student_id', studentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
    },
  });
}
