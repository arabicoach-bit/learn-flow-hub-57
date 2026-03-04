import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PackageSummary {
  package_id: string;
  student_name: string;
  student_phone: string;
  parent_phone: string | null;
  amount: number;
  lessons_purchased: number;
  lessons_used: number;
  payment_date: string | null;
  completed_date: string | null;
  status: 'Active' | 'Completed';
  teacher_name: string | null;
  program_name: string | null;
  student_level: string | null;
  lessons: {
    date: string;
    teacher_name: string;
    status: 'completed' | 'absent' | 'scheduled';
    notes: string | null;
    duration_minutes: number | null;
    scheduled_time: string | null;
  }[];
  statistics: {
    total_completed: number;
    total_absent: number;
    total_scheduled: number;
  };
}

export interface Package {
  package_id: string;
  student_id: string;
  amount: number;
  lessons_purchased: number;
  lessons_used: number;
  status: 'Active' | 'Completed';
  payment_date: string | null;
  completed_date: string | null;
  created_at: string;
  students?: {
    name: string;
    phone: string;
    parent_phone: string | null;
    teachers?: {
      name: string;
    } | null;
  };
}

export function usePackages(filters?: { 
  status?: string; 
  student_id?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['packages', filters],
    queryFn: async () => {
      let query = supabase
        .from('packages')
        .select('*, students!packages_student_id_fkey(name, phone, parent_phone, teacher_id, teachers(name))')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as 'Active' | 'Completed');
      }
      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      let packages = data as Package[];
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        packages = packages.filter(p => 
          p.students?.name?.toLowerCase().includes(searchLower)
        );
      }

      return packages;
    },
  });
}

export function usePackageSummary(packageId: string | null) {
  return useQuery({
    queryKey: ['package-summary', packageId],
    queryFn: async () => {
      if (!packageId) return null;

      // Get summary from RPC
      const { data, error } = await supabase.rpc('generate_package_summary', {
        p_package_id: packageId,
      });
      if (error) throw error;
      const summary = data as unknown as PackageSummary;

      // Enrich with scheduled_lessons data for duration and time
      const { data: lessonsData } = await supabase
        .from('scheduled_lessons')
        .select('scheduled_date, scheduled_time, duration_minutes, status, notes, teachers(name)')
        .eq('package_id', packageId)
        .order('scheduled_date', { ascending: true });

      if (lessonsData && lessonsData.length > 0) {
        summary.lessons = lessonsData.map((l: any) => ({
          date: l.scheduled_date,
          teacher_name: l.teachers?.name || summary.teacher_name || 'N/A',
          status: l.status as 'completed' | 'absent' | 'scheduled',
          notes: l.notes,
          duration_minutes: l.duration_minutes,
          scheduled_time: l.scheduled_time,
        }));
        // Recalculate statistics from enriched data
        summary.statistics = {
          total_completed: summary.lessons.filter(l => l.status === 'completed').length,
          total_absent: summary.lessons.filter(l => l.status === 'absent').length,
          total_scheduled: summary.lessons.filter(l => l.status === 'scheduled').length,
        };
      }

      // Enrich with student details
      const { data: pkgData } = await supabase
        .from('packages')
        .select('students(teacher_id, student_level, program_id, teachers(name), programs(name))')
        .eq('package_id', packageId)
        .single();

      if (pkgData) {
        const student = (pkgData as any).students;
        summary.teacher_name = student?.teachers?.name || null;
        summary.program_name = student?.programs?.name || null;
        summary.student_level = student?.student_level || null;
      }

      return summary;
    },
    enabled: !!packageId,
  });
}

export function useAutoCompletePackages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (silent: boolean = false) => {
      // Get all active packages with lessons_used > 0
      const { data: activePackages } = await supabase
        .from('packages')
        .select('package_id, lessons_used, lessons_purchased')
        .eq('status', 'Active');

      if (!activePackages?.length) return { count: 0, silent };

      // Check which have remaining scheduled lessons
      const { data: scheduledCounts } = await supabase
        .from('scheduled_lessons')
        .select('package_id')
        .in('package_id', activePackages.map(p => p.package_id))
        .eq('status', 'scheduled');

      const packagesWithScheduled = new Set(
        scheduledCounts?.map(s => s.package_id) || []
      );

      // Find packages to complete: lessons_used >= purchased OR no scheduled remaining (but has some usage)
      const toComplete = activePackages.filter(p =>
        (p.lessons_used !== null && p.lessons_used >= p.lessons_purchased) ||
        (!packagesWithScheduled.has(p.package_id) && (p.lessons_used ?? 0) > 0)
      );

      if (toComplete.length === 0) return { count: 0, silent };

      // Mark them completed
      const { error } = await supabase
        .from('packages')
        .update({
          status: 'Completed' as const,
          completed_date: new Date().toISOString(),
        })
        .in('package_id', toComplete.map(p => p.package_id));

      if (error) throw error;
      return { count: toComplete.length, silent };
    },
    onSuccess: ({ count, silent }) => {
      if (count > 0) {
        queryClient.invalidateQueries({ queryKey: ['packages'] });
        queryClient.invalidateQueries({ queryKey: ['packages-recent'] });
        queryClient.invalidateQueries({ queryKey: ['students'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
        if (!silent) {
          toast.success(`${count} package(s) marked as completed`);
        }
      }
    },
  });
}
