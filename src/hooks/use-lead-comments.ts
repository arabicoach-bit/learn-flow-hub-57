import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { processMentions } from '@/lib/mention-utils';

export interface LeadComment {
  comment_id: string;
  lead_id: string;
  author_id: string | null;
  comment: string;
  created_at: string;
  is_pinned?: boolean;
  updated_at?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
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
    mutationFn: async ({ leadId, comment, attachmentUrl, attachmentName }: { leadId: string; comment: string; attachmentUrl?: string; attachmentName?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('lead_comments')
        .insert({
          lead_id: leadId,
          comment,
          author_id: user?.id ?? null,
          attachment_url: attachmentUrl || null,
          attachment_name: attachmentName || null,
        } as any);
      if (error) throw error;
      const { data: lead } = await supabase.from('leads').select('name').eq('lead_id', leadId).single();
      processMentions(comment, 'Lead', lead?.name || 'Unknown');
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['lead-comments', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-comments-count'] });
    },
  });
}

export function useEditLeadComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, comment, leadId }: { commentId: string; comment: string; leadId: string }) => {
      const { error } = await supabase
        .from('lead_comments')
        .update({ comment, updated_at: new Date().toISOString() })
        .eq('comment_id', commentId);
      if (error) throw error;
      return leadId;
    },
    onSuccess: (leadId) => {
      queryClient.invalidateQueries({ queryKey: ['lead-comments', leadId] });
    },
  });
}

export function useDeleteLeadComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, leadId }: { commentId: string; leadId: string }) => {
      const { error } = await supabase
        .from('lead_comments')
        .delete()
        .eq('comment_id', commentId);
      if (error) throw error;
      return leadId;
    },
    onSuccess: (leadId) => {
      queryClient.invalidateQueries({ queryKey: ['lead-comments', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-comments-count'] });
    },
  });
}

export function useTogglePinLeadComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, pinned, leadId }: { commentId: string; pinned: boolean; leadId: string }) => {
      const { error } = await supabase
        .from('lead_comments')
        .update({ is_pinned: pinned })
        .eq('comment_id', commentId);
      if (error) throw error;
      return leadId;
    },
    onSuccess: (leadId) => {
      queryClient.invalidateQueries({ queryKey: ['lead-comments', leadId] });
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
