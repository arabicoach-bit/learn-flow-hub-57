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
  first_contact_date: string | null;
  last_contact_date: string | null;
  trial_status: string | null;
  follow_up: string | null;
  handled_by: string | null;
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
  first_contact_date?: string;
  last_contact_date?: string;
  trial_status?: string;
  follow_up?: string;
  handled_by?: string;
}

export function useLeads(filters?: { status?: string; search?: string; trial_status?: string; date_range?: string }) {
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
      if (filters?.trial_status) {
        query = query.eq('trial_status', filters.trial_status);
      }
      if (filters?.date_range) {
        const now = new Date();
        let startDate: Date | null = null;
        switch (filters.date_range) {
          case '1_week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '2_weeks':
            startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            break;
          case '1_month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            break;
          case '3_months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            break;
          case '6_months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
            break;
        }
        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
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
          first_contact_date: input.first_contact_date || null,
          last_contact_date: input.last_contact_date || null,
          trial_status: input.trial_status || null,
          follow_up: input.follow_up || null,
          handled_by: input.handled_by || null,
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
      const updateData: Record<string, unknown> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.source !== undefined) updateData.source = data.source || null;
      if (data.interest !== undefined) updateData.interest = data.interest || null;
      if (data.notes !== undefined) updateData.notes = data.notes || null;
      if (data.next_followup_date !== undefined) updateData.next_followup_date = data.next_followup_date || null;
      if (data.first_contact_date !== undefined) updateData.first_contact_date = data.first_contact_date || null;
      if (data.last_contact_date !== undefined) updateData.last_contact_date = data.last_contact_date || null;
      if (data.trial_status !== undefined) updateData.trial_status = data.trial_status || null;
      if (data.follow_up !== undefined) updateData.follow_up = data.follow_up || null;
      if (data.handled_by !== undefined) updateData.handled_by = data.handled_by || null;
      if (data.status !== undefined) updateData.status = data.status;
      
      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('lead_id', leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
    },
  });
}
