import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
    total_taken: number;
    total_absent: number;
    total_cancelled: number;
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
          total_taken: summary.lessons.filter(l => l.status === 'completed').length,
          total_absent: summary.lessons.filter(l => l.status === 'absent').length,
          total_cancelled: summary.lessons.filter(l => l.status !== 'completed' && l.status !== 'absent' && l.status !== 'scheduled').length,
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
