import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { processMentions } from '@/lib/mention-utils';

export interface PackageComment {
  comment_id: string;
  package_id: string;
  author_id: string | null;
  comment: string;
  created_at: string;
  is_pinned?: boolean;
  updated_at?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  profiles?: { full_name: string } | null;
}

export function usePackageComments(packageId: string | null) {
  return useQuery({
    queryKey: ['package-comments', packageId],
    enabled: !!packageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('package_comments')
        .select('*, profiles(full_name)')
        .eq('package_id', packageId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as PackageComment[];
    },
  });
}

export function useAddPackageComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ packageId, comment, attachmentUrl, attachmentName }: { packageId: string; comment: string; attachmentUrl?: string; attachmentName?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('package_comments')
        .insert({
          package_id: packageId,
          comment,
          author_id: user?.id ?? null,
          attachment_url: attachmentUrl || null,
          attachment_name: attachmentName || null,
        } as any);
      if (error) throw error;
      processMentions(comment, 'Package', packageId);
    },
    onSuccess: (_, { packageId }) => {
      queryClient.invalidateQueries({ queryKey: ['package-comments', packageId] });
      queryClient.invalidateQueries({ queryKey: ['package-comments-count'] });
    },
  });
}

export function useEditPackageComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, comment, packageId }: { commentId: string; comment: string; packageId: string }) => {
      const { error } = await supabase
        .from('package_comments')
        .update({ comment, updated_at: new Date().toISOString() })
        .eq('comment_id', commentId);
      if (error) throw error;
      return packageId;
    },
    onSuccess: (packageId) => {
      queryClient.invalidateQueries({ queryKey: ['package-comments', packageId] });
    },
  });
}

export function useDeletePackageComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, packageId }: { commentId: string; packageId: string }) => {
      const { error } = await supabase
        .from('package_comments')
        .delete()
        .eq('comment_id', commentId);
      if (error) throw error;
      return packageId;
    },
    onSuccess: (packageId) => {
      queryClient.invalidateQueries({ queryKey: ['package-comments', packageId] });
      queryClient.invalidateQueries({ queryKey: ['package-comments-count'] });
    },
  });
}

export function useTogglePinPackageComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, pinned, packageId }: { commentId: string; pinned: boolean; packageId: string }) => {
      const { error } = await supabase
        .from('package_comments')
        .update({ is_pinned: pinned })
        .eq('comment_id', commentId);
      if (error) throw error;
      return packageId;
    },
    onSuccess: (packageId) => {
      queryClient.invalidateQueries({ queryKey: ['package-comments', packageId] });
    },
  });
}

export function usePackageCommentsCounts(packageIds: string[]) {
  return useQuery({
    queryKey: ['package-comments-count', packageIds],
    enabled: packageIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('package_comments')
        .select('package_id')
        .in('package_id', packageIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((row) => {
        counts[row.package_id] = (counts[row.package_id] || 0) + 1;
      });
      return counts;
    },
  });
}
