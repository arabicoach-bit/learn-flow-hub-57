import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StudentComment {
  comment_id: string;
  student_id: string;
  author_id: string | null;
  comment: string;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export function useStudentComments(studentId: string | null) {
  return useQuery({
    queryKey: ['student-comments', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_comments')
        .select('*, profiles(full_name)')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as StudentComment[];
    },
  });
}

export function useAddStudentComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, comment }: { studentId: string; comment: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('student_comments')
        .insert({ student_id: studentId, comment, author_id: user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: (_, { studentId }) => {
      queryClient.invalidateQueries({ queryKey: ['student-comments', studentId] });
      queryClient.invalidateQueries({ queryKey: ['student-comments-count'] });
    },
  });
}

export function useStudentCommentsCounts(studentIds: string[]) {
  return useQuery({
    queryKey: ['student-comments-count', studentIds],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_comments')
        .select('student_id')
        .in('student_id', studentIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((row) => {
        counts[row.student_id] = (counts[row.student_id] || 0) + 1;
      });
      return counts;
    },
  });
}
