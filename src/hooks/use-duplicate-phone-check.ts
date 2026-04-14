import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DuplicateResult {
  found: boolean;
  matches: Array<{
    type: 'lead' | 'trial' | 'student';
    name: string;
    status: string;
    id: string;
  }>;
}

export function useDuplicatePhoneCheck(phone: string, enabled = true) {
  const normalizedPhone = phone.replace(/[\s\-()]/g, '');
  
  return useQuery({
    queryKey: ['duplicate-phone', normalizedPhone],
    enabled: enabled && normalizedPhone.length >= 8,
    staleTime: 10_000,
    queryFn: async (): Promise<DuplicateResult> => {
      const matches: DuplicateResult['matches'] = [];

      // Check leads
      const { data: leads } = await supabase
        .from('leads')
        .select('lead_id, name, trial_status, phone')
        .or(`phone.ilike.%${normalizedPhone}%`);

      leads?.forEach(l => {
        matches.push({ type: 'lead', name: l.name, status: l.trial_status, id: l.lead_id });
      });

      // Check trial students
      const { data: trials } = await supabase
        .from('trial_students')
        .select('trial_id, name, status, phone')
        .or(`phone.ilike.%${normalizedPhone}%`);

      trials?.forEach(t => {
        matches.push({ type: 'trial', name: t.name, status: t.status, id: t.trial_id });
      });

      // Check students
      const { data: students } = await supabase
        .from('students')
        .select('student_id, name, status, phone')
        .or(`phone.ilike.%${normalizedPhone}%`);

      students?.forEach(s => {
        matches.push({ type: 'student', name: s.name, status: s.status || 'Active', id: s.student_id });
      });

      return { found: matches.length > 0, matches };
    },
  });
}
