import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Package {
  package_id: string;
  student_id: string;
  payment_date: string;
  amount: number;
  lessons_purchased: number;
  lessons_used: number;
  status: 'Active' | 'Completed';
  completed_date: string | null;
  created_at: string;
  students?: { name: string } | null;
}

export interface CreatePackageInput {
  student_id: string;
  amount: number;
  lessons_purchased: number;
}

export function usePackages(studentId?: string) {
  return useQuery({
    queryKey: ['packages', studentId],
    queryFn: async () => {
      let query = supabase
        .from('packages')
        .select('*, students(name)')
        .order('created_at', { ascending: false });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Package[];
    },
  });
}

export function useRecentPackages(limit = 20) {
  return useQuery({
    queryKey: ['packages-recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*, students(name)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Package[];
    },
  });
}

export function useAddPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePackageInput) => {
      const { data, error } = await supabase.rpc('add_package_with_debt', {
        p_student_id: input.student_id,
        p_amount: input.amount,
        p_lessons_purchased: input.lessons_purchased,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
