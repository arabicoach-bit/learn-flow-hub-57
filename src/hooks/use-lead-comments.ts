import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadComment {
  comment_id: string;
  lead_id: string;
  author_id: string | null;
  comment: string;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export function useLeadComments(leadId: string | null) {
  return useQuery({
    queryKey: ['lead-comments', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_comments')
        .select('*, profiles(full_name)')
        .eq('lead_id', leadId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as LeadComment[];
    },
  });
}

export function useAddLeadComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, comment }: { leadId: string; comment: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('lead_comments')
        .insert({ lead_id: leadId, comment, author_id: user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['lead-comments', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-comments-count'] });
    },
  });
}

export function useLeadCommentsCounts(leadIds: string[]) {
  return useQuery({
    queryKey: ['lead-comments-count', leadIds],
    enabled: leadIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_comments')
        .select('lead_id')
        .in('lead_id', leadIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((row) => {
        counts[row.lead_id] = (counts[row.lead_id] || 0) + 1;
      });
      return counts;
    },
  });
}
