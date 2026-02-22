import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WeeklyScheduleDay {
  day: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  time: string; // HH:MM format
}

export interface AddPackageWithScheduleInput {
  student_id: string;
  package_type_id?: string;
  amount: number;
  lessons_purchased: number;
  lesson_duration: number;
  start_date: string;
  teacher_id: string;
  weekly_schedule: WeeklyScheduleDay[];
}

export function useAddPackageWithSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddPackageWithScheduleInput) => {
      // 1. Get current student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('wallet_balance, number_of_renewals, total_paid')
        .eq('student_id', input.student_id)
        .single();

      if (studentError) throw studentError;

      const oldWallet = student.wallet_balance || 0;
      const newLessons = input.lessons_purchased;

      // 2. Calculate debt coverage
      let debtCovered = 0;
      if (oldWallet < 0) {
        debtCovered = Math.min(Math.abs(oldWallet), newLessons);
      }

      const newWallet = oldWallet + newLessons;

      // 3. Calculate next payment date (30 days from start)
      const startDate = new Date(input.start_date);
      const nextPaymentDate = new Date(startDate);
      nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);

      // 4. Create package record
      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .insert({
          student_id: input.student_id,
          package_type_id: input.package_type_id || null,
          amount: input.amount,
          lessons_purchased: newLessons,
          lessons_used: debtCovered,
          start_date: input.start_date,
          next_payment_date: nextPaymentDate.toISOString().split('T')[0],
          lesson_duration: input.lesson_duration,
          status: 'Active',
          is_renewal: (student.number_of_renewals || 0) > 0,
        })
        .select()
        .single();

      if (packageError) throw packageError;

      // 5. Insert weekly schedule template
      for (const scheduleDay of input.weekly_schedule) {
        const { error: scheduleError } = await supabase
          .from('lesson_schedules')
          .insert({
            package_id: packageData.package_id,
            day_of_week: scheduleDay.day,
            time_slot: scheduleDay.time + ':00', // Add seconds
            timezone: 'Asia/Dubai',
          });

        if (scheduleError) throw scheduleError;
      }

      // 6. Generate all scheduled lessons using the database function
      const { data: generatedSchedule, error: generateError } = await supabase.rpc(
        'generate_package_schedule',
        {
          p_package_id: packageData.package_id,
          p_student_id: input.student_id,
          p_teacher_id: input.teacher_id,
          p_class_id: null,
          p_start_date: input.start_date,
          p_total_lessons: newLessons,
          p_lesson_duration: input.lesson_duration,
          p_schedule_days: input.weekly_schedule.map(s => ({ day: s.day, time: s.time })),
        }
      );

      if (generateError) throw generateError;

      // 7. Update student wallet and stats
      const { error: updateStudentError } = await supabase
        .from('students')
        .update({
          wallet_balance: newWallet,
          current_package_id: packageData.package_id,
          status: newWallet > 0 ? 'Active' : 'Temporary Stop',
          total_paid: (student.total_paid || 0) + input.amount,
          number_of_renewals: (student.number_of_renewals || 0) + 1,
          teacher_id: input.teacher_id,
        })
        .eq('student_id', input.student_id);

      if (updateStudentError) throw updateStudentError;

      return {
        package: packageData,
        generatedSchedule,
        newWallet,
        debtCovered,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student'] });
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
