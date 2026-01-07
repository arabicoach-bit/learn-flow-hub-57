import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Class {
  class_id: string;
  name: string;
  schedule: string | null;
  teacher_id: string | null;
  created_at: string;
  teachers?: { name: string } | null;
}

export interface CreateClassInput {
  name: string;
  schedule?: string;
  teacher_id?: string;
}

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*, teachers(name)')
        .order('name');

      if (error) throw error;
      return data as Class[];
    },
  });
}

export function useClass(classId: string) {
  return useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*, teachers(name)')
        .eq('class_id', classId)
        .maybeSingle();

      if (error) throw error;
      return data as Class | null;
    },
    enabled: !!classId,
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateClassInput) => {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: input.name,
          schedule: input.schedule || null,
          teacher_id: input.teacher_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, ...data }: { classId: string } & Partial<CreateClassInput>) => {
      const { error } = await supabase
        .from('classes')
        .update(data)
        .eq('class_id', classId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['class'] });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('class_id', classId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}
