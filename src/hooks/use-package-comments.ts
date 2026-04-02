import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PackageComment {
  comment_id: string;
  package_id: string;
  author_id: string | null;
  comment: string;
  created_at: string;
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
    mutationFn: async ({ packageId, comment }: { packageId: string; comment: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('package_comments')
        .insert({ package_id: packageId, comment, author_id: user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: (_, { packageId }) => {
      queryClient.invalidateQueries({ queryKey: ['package-comments', packageId] });
      queryClient.invalidateQueries({ queryKey: ['package-comments-count'] });
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
