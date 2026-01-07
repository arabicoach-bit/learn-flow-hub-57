import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Lead {
  lead_id: string;
  date: string;
  name: string;
  phone: string;
  source: string | null;
  interest: string | null;
  status: 'New' | 'Contacted' | 'Interested' | 'Converted' | 'Lost';
  next_followup_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadInput {
  name: string;
  phone: string;
  source?: string;
  interest?: string;
  notes?: string;
  next_followup_date?: string;
}

export function useLeads(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status && ['New', 'Contacted', 'Interested', 'Converted', 'Lost'].includes(filters.status)) {
        query = query.eq('status', filters.status as 'New' | 'Contacted' | 'Interested' | 'Converted' | 'Lost');
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useLead(leadId: string) {
  return useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error) throw error;
      return data as Lead | null;
    },
    enabled: !!leadId,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLeadInput) => {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          name: input.name,
          phone: input.phone,
          source: input.source || null,
          interest: input.interest || null,
          notes: input.notes || null,
          next_followup_date: input.next_followup_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, ...data }: { leadId: string } & Partial<CreateLeadInput> & { status?: Lead['status'] }) => {
      const { error } = await supabase
        .from('leads')
        .update(data)
        .eq('lead_id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
    },
  });
}
