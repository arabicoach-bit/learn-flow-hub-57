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
  lessons: {
    date: string;
    class_name: string;
    teacher_name: string;
    status: 'Taken' | 'Absent' | 'Cancelled';
    notes: string | null;
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
        .select('*, students(name, phone, parent_phone)')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as 'Active' | 'Completed');
      }
      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search if provided
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

      const { data, error } = await supabase.rpc('generate_package_summary', {
        p_package_id: packageId,
      });

      if (error) throw error;
      return data as unknown as PackageSummary;
    },
    enabled: !!packageId,
  });
}
