import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PendingPackage {
  package_id: string;
  student_id: string;
  package_type_id: string | null;
  amount: number;
  lessons_purchased: number;
  lessons_used: number;
  lesson_duration: number | null;
  start_date: string | null;
  status: string;
  payment_received: boolean;
  admin_approved: boolean;
  created_at: string;
  students: {
    name: string;
    wallet_balance: number;
    teacher_id: string | null;
    phone: string;
    parent_phone: string | null;
  };
  package_types?: {
    name: string;
  } | null;
}

export function usePendingPackages() {
  return useQuery({
    queryKey: ['pending-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          students!inner(name, wallet_balance, teacher_id, phone, parent_phone),
          package_types(name)
        `)
        .eq('admin_approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as PendingPackage[];
    },
  });
}

export function useActivatePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageId: string) => {
      // 1. Get package details with student and schedules
      const { data: pkg, error: pkgError } = await supabase
        .from('packages')
        .select(`
          *,
          students!inner(student_id, name, wallet_balance, teacher_id, total_paid, number_of_renewals, status)
        `)
        .eq('package_id', packageId)
        .single();

      if (pkgError) throw pkgError;
      if (!pkg) throw new Error('Package not found');

      const student = pkg.students as any;
      const currentWallet = student.wallet_balance || 0;
      
      // 2. Calculate debt coverage
      let debtCovered = 0;
      if (currentWallet < 0) {
        debtCovered = Math.min(Math.abs(currentWallet), pkg.lessons_purchased);
      }
      
      const newWallet = currentWallet + pkg.lessons_purchased;

      // 3. Update package status
      const { error: updatePkgError } = await supabase
        .from('packages')
        .update({
          status: 'Active',
          admin_approved: true,
          approved_at: new Date().toISOString(),
          payment_received: true,
          lessons_used: debtCovered,
        })
        .eq('package_id', packageId);

      if (updatePkgError) throw updatePkgError;

      // 4. Get lesson schedules for this package
      const { data: schedules } = await supabase
        .from('lesson_schedules')
        .select('*')
        .eq('package_id', packageId);

      // 5. Generate scheduled lessons if we have schedule templates and a teacher
      if (schedules && schedules.length > 0 && student.teacher_id && pkg.start_date) {
        const scheduleDays = schedules.map(s => ({
          day: s.day_of_week,
          time: s.time_slot,
        }));

        await supabase.rpc('generate_package_schedule', {
          p_package_id: packageId,
          p_student_id: student.student_id,
          p_teacher_id: student.teacher_id,
          p_class_id: null,
          p_start_date: pkg.start_date,
          p_total_lessons: pkg.lessons_purchased,
          p_lesson_duration: pkg.lesson_duration || 45,
          p_schedule_days: scheduleDays,
        });
      }

      // 6. Update student wallet and status
      const newStatus = newWallet > 0 ? 'Active' : 'Grace';
      const { error: updateStudentError } = await supabase
        .from('students')
        .update({
          wallet_balance: newWallet,
          current_package_id: packageId,
          status: newStatus,
          total_paid: (student.total_paid || 0) + pkg.amount,
          number_of_renewals: (student.number_of_renewals || 0) + 1,
        })
        .eq('student_id', student.student_id);

      if (updateStudentError) throw updateStudentError;

      return {
        studentName: student.name,
        debtCovered,
        newWallet,
        lessonsScheduled: pkg.lessons_purchased,
      };
    },
    onSuccess: (data) => {
      toast.success(`Package activated for ${data.studentName}!`, {
        description: `New balance: ${data.newWallet} lessons. ${data.debtCovered > 0 ? `Debt covered: ${data.debtCovered} lessons.` : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ['pending-packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error) => {
      toast.error('Failed to activate package', {
        description: error.message,
      });
    },
  });
}

export function useCreatePendingPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      student_id: string;
      package_type_id?: string;
      amount: number;
      lessons_purchased: number;
      lesson_duration?: number;
      start_date: string;
      weekly_schedule: { day: number; time: string }[];
      payment_received?: boolean;
    }) => {
      // 1. Create package with status = 'Active' but admin_approved = false (Pending)
      const { data: pkg, error: pkgError } = await supabase
        .from('packages')
        .insert({
          student_id: input.student_id,
          package_type_id: input.package_type_id || null,
          amount: input.amount,
          lessons_purchased: input.lessons_purchased,
          lesson_duration: input.lesson_duration || 45,
          start_date: input.start_date,
          status: 'Active', // Will be marked as 'Active' but admin_approved = false indicates pending
          payment_received: input.payment_received || false,
          admin_approved: false,
          lessons_used: 0,
        })
        .select()
        .single();

      if (pkgError) throw pkgError;

      // 2. Save weekly schedule template
      if (input.weekly_schedule && input.weekly_schedule.length > 0) {
        const schedules = input.weekly_schedule.map(day => ({
          package_id: pkg.package_id,
          day_of_week: day.day,
          time_slot: day.time,
        }));

        const { error: scheduleError } = await supabase
          .from('lesson_schedules')
          .insert(schedules);

        if (scheduleError) throw scheduleError;
      }

      return pkg;
    },
    onSuccess: () => {
      toast.success('Package created as Pending', {
        description: 'Activate when payment is received.',
      });
      queryClient.invalidateQueries({ queryKey: ['pending-packages'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
    onError: (error) => {
      toast.error('Failed to create package', {
        description: error.message,
      });
    },
  });
}
