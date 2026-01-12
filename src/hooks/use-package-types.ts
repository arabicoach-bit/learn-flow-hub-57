import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PackageType {
  package_type_id: string;
  name: string;
  description: string | null;
  lessons_per_week: number | null;
  lesson_duration: number | null;
  monthly_fee: number | null;
  total_lessons: number | null;
  is_active: boolean;
  created_at: string;
}

export function usePackageTypes() {
  return useQuery({
    queryKey: ['package-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('package_types')
        .select('*')
        .eq('is_active', true)
        .order('monthly_fee');

      if (error) throw error;
      return data as PackageType[];
    },
  });
}
