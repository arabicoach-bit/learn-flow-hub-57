import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Teacher {
  teacher_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  rate_per_lesson: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTeacherInput {
  name: string;
  phone?: string;
  email?: string;
  rate_per_lesson?: number;
}

export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Teacher[];
    },
  });
}

export function useTeacher(teacherId: string) {
  return useQuery({
    queryKey: ['teacher', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('teacher_id', teacherId)
        .maybeSingle();

      if (error) throw error;
      return data as Teacher | null;
    },
    enabled: !!teacherId,
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTeacherInput) => {
      const { data, error } = await supabase
        .from('teachers')
        .insert({
          name: input.name,
          phone: input.phone || null,
          email: input.email || null,
          rate_per_lesson: input.rate_per_lesson || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teacherId, ...data }: { teacherId: string } & Partial<CreateTeacherInput>) => {
      const { error } = await supabase
        .from('teachers')
        .update(data)
        .eq('teacher_id', teacherId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
    },
  });
}
