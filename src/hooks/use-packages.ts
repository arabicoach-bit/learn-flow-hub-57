import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AddPackageResult {
  success: boolean;
  package_id: string;
  old_wallet: number;
  new_wallet: number;
  debt_covered: number;
}

export interface Package {
  package_id: string;
  student_id: string;
  package_type_id: string | null;
  payment_date: string;
  amount: number;
  lessons_purchased: number;
  lessons_used: number;
  lesson_duration: number | null;
  start_date: string | null;
  next_payment_date: string | null;
  schedule_generated: boolean | null;
  is_renewal: boolean | null;
  status: 'Active' | 'Completed';
  description: string | null;
  payment_status: string;
  payment_received: boolean | null;
  paid_date: string | null;
  completed_date: string | null;
  created_at: string;
  students?: { 
    name: string;
    teacher_id: string | null;
    teachers?: { name: string } | null;
  } | null;
  package_types?: { name: string; description: string | null } | null;
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
        .select('*, students!packages_student_id_fkey(name, teacher_id, teachers(name)), package_types(name, description)')
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
        .select('*, students!packages_student_id_fkey(name, teacher_id, teachers(name)), package_types(name, description)')
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
    mutationFn: async (input: CreatePackageInput): Promise<AddPackageResult> => {
      const { data, error } = await supabase.rpc('add_package_with_debt', {
        p_student_id: input.student_id,
        p_amount: input.amount,
        p_lessons_purchased: input.lessons_purchased,
      });

      if (error) throw error;
      return data as unknown as AddPackageResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-tomorrows-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-students'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
    },
  });
}

export function useDeletePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ packageId, studentId }: { packageId: string; studentId: string }) => {
      // Get the package info for return value
      const { data: pkg, error: pkgError } = await supabase
        .from('packages')
        .select('lessons_purchased, lessons_used')
        .eq('package_id', packageId)
        .single();

      if (pkgError) throw pkgError;
      const lessonsRemaining = pkg.lessons_purchased - (pkg.lessons_used || 0);

      // Delete all scheduled lessons for this package
      const { error: deleteScheduledError } = await supabase
        .from('scheduled_lessons')
        .delete()
        .eq('package_id', packageId);

      if (deleteScheduledError) throw deleteScheduledError;

      // Delete lesson schedule templates for this package
      const { error: deleteScheduleError } = await supabase
        .from('lesson_schedules')
        .delete()
        .eq('package_id', packageId);

      if (deleteScheduleError) throw deleteScheduleError;

      // Delete the package itself
      const { error: deletePackageError } = await supabase
        .from('packages')
        .delete()
        .eq('package_id', packageId);

      if (deletePackageError) throw deletePackageError;

      // Update current_package_id to next active package (if any)
      const { data: remainingPackages } = await supabase
        .from('packages')
        .select('package_id')
        .eq('student_id', studentId)
        .eq('status', 'Active')
        .limit(1);

      await supabase
        .from('students')
        .update({
          current_package_id: remainingPackages?.[0]?.package_id || null,
        })
        .eq('student_id', studentId);

      // Recalculate wallet from DB (single source of truth)
      await supabase.rpc('recalculate_student_wallet', { p_student_id: studentId });

      return { packageId, lessonsRemaining };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages-recent'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-todays-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-tomorrows-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-week-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-past-7-days-unmarked'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-monthly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-students'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['package-stats'] });
    },
  });
}
