import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrialComment {
  comment_id: string;
  trial_id: string;
  author_id: string | null;
  comment: string;
  created_at: string;
  is_pinned?: boolean;
  updated_at?: string | null;
  profiles?: { full_name: string } | null;
}

export function useTrialComments(trialId: string | null) {
  return useQuery({
    queryKey: ['trial-comments', trialId],
    enabled: !!trialId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trial_comments')
        .select('*, profiles(full_name)')
        .eq('trial_id', trialId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TrialComment[];
    },
  });
}

export function useAddTrialComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ trialId, comment }: { trialId: string; comment: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('trial_comments')
        .insert({ trial_id: trialId, comment, author_id: user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: (_, { trialId }) => {
      queryClient.invalidateQueries({ queryKey: ['trial-comments', trialId] });
      queryClient.invalidateQueries({ queryKey: ['trial-comments-count'] });
    },
  });
}

export function useEditTrialComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, comment, trialId }: { commentId: string; comment: string; trialId: string }) => {
      const { error } = await supabase
        .from('trial_comments')
        .update({ comment, updated_at: new Date().toISOString() })
        .eq('comment_id', commentId);
      if (error) throw error;
      return trialId;
    },
    onSuccess: (trialId) => {
      queryClient.invalidateQueries({ queryKey: ['trial-comments', trialId] });
    },
  });
}

export function useDeleteTrialComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, trialId }: { commentId: string; trialId: string }) => {
      const { error } = await supabase
        .from('trial_comments')
        .delete()
        .eq('comment_id', commentId);
      if (error) throw error;
      return trialId;
    },
    onSuccess: (trialId) => {
      queryClient.invalidateQueries({ queryKey: ['trial-comments', trialId] });
      queryClient.invalidateQueries({ queryKey: ['trial-comments-count'] });
    },
  });
}

export function useTogglePinTrialComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, pinned, trialId }: { commentId: string; pinned: boolean; trialId: string }) => {
      const { error } = await supabase
        .from('trial_comments')
        .update({ is_pinned: pinned })
        .eq('comment_id', commentId);
      if (error) throw error;
      return trialId;
    },
    onSuccess: (trialId) => {
      queryClient.invalidateQueries({ queryKey: ['trial-comments', trialId] });
    },
  });
}

export function useTrialCommentsCounts(trialIds: string[]) {
  return useQuery({
    queryKey: ['trial-comments-count', trialIds],
    enabled: trialIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trial_comments')
        .select('trial_id')
        .in('trial_id', trialIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((row) => {
        counts[row.trial_id] = (counts[row.trial_id] || 0) + 1;
      });
      return counts;
    },
  });
}
