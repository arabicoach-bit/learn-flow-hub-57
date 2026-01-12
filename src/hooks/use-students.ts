import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Student {
  student_id: string;
  name: string;
  phone: string;
  parent_phone: string | null;
  parent_guardian_name: string | null;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  school: string | null;
  year_group: string | null;
  program_id: string | null;
  student_level: string | null;
  class_id: string | null;
  teacher_id: string | null;
  status: 'Active' | 'Grace' | 'Blocked';
  wallet_balance: number;
  current_package_id: string | null;
  total_paid: number | null;
  number_of_renewals: number | null;
  created_at: string;
  updated_at: string;
  classes?: { name: string } | null;
  teachers?: { name: string } | null;
  programs?: { name: string } | null;
}

export interface CreateStudentInput {
  name: string;
  phone: string;
  parent_phone?: string;
  parent_guardian_name?: string;
  age?: number;
  gender?: string;
  nationality?: string;
  school?: string;
  year_group?: string;
  program_id?: string;
  student_level?: string;
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
        .select('*, classes(name), teachers(name), programs(name)')
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
        .select('*, classes(name), teachers(name), programs(name)')
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
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          name: input.name,
          phone: input.phone,
          parent_phone: input.parent_phone || null,
          parent_guardian_name: input.parent_guardian_name || null,
          age: input.age || null,
          gender: input.gender || null,
          nationality: input.nationality || null,
          school: input.school || null,
          year_group: input.year_group || null,
          program_id: input.program_id || null,
          student_level: input.student_level || null,
          class_id: input.class_id || null,
          teacher_id: input.teacher_id || null,
          wallet_balance: input.initial_lessons || 0,
          status: (input.initial_lessons || 0) > 0 ? 'Active' : 'Grace',
        })
        .select()
        .single();

      if (studentError) throw studentError;

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

        await supabase
          .from('students')
          .update({ 
            current_package_id: packageData.package_id,
            total_paid: input.initial_amount 
          })
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
    mutationFn: async ({ studentId, ...data }: { 
      studentId: string; 
      name?: string; 
      phone?: string; 
      parent_phone?: string | null;
      parent_guardian_name?: string | null;
      age?: number | null;
      gender?: string | null;
      nationality?: string | null;
      school?: string | null;
      year_group?: string | null;
      program_id?: string | null;
      student_level?: string | null;
      class_id?: string | null; 
      teacher_id?: string | null;
    }) => {
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
