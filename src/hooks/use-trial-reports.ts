import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CommentBankEntry {
  comment_id: string;
  skill: 'reading' | 'speaking';
  level: 'beginner' | 'developing' | 'strong';
  comment_type: 'strength' | 'next_step';
  comment_text: string;
  display_order: number;
}

export interface TrialReport {
  report_id: string;
  trial_id: string;
  reading_level: string;
  speaking_level: string;
  selected_comments: any;
  template_text: string | null;
  ai_polished_text: string | null;
  final_text: string;
  generated_by: string | null;
  created_at: string;
}

export function useCommentBank() {
  return useQuery({
    queryKey: ['report-comment-bank'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_comment_bank')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as CommentBankEntry[];
    },
  });
}

export function useTrialReports(trialId: string) {
  return useQuery({
    queryKey: ['trial-reports', trialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trial_reports')
        .select('*')
        .eq('trial_id', trialId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TrialReport[];
    },
    enabled: !!trialId,
  });
}

function buildTemplateParagraph(
  studentName: string,
  readingStrengths: string[],
  readingNextSteps: string[],
  speakingStrengths: string[],
  speakingNextSteps: string[]
): string {
  const parts: string[] = [];

  // Opening
  parts.push(`${studentName} showed good engagement during the trial lesson.`);

  // Reading strengths
  if (readingStrengths.length > 0) {
    const joined = joinList(readingStrengths);
    parts.push(`In reading, ${studentName} ${joined}.`);
  }

  // Speaking strengths
  if (speakingStrengths.length > 0) {
    const joined = joinList(speakingStrengths);
    parts.push(`In speaking and listening, ${studentName} ${joined}.`);
  }

  // Next steps combined
  const allNextSteps = [
    ...readingNextSteps.map(s => `${s} (reading)`),
    ...speakingNextSteps.map(s => `${s} (speaking)`),
  ];
  if (allNextSteps.length > 0) {
    parts.push(`To continue progressing, ${studentName} should ${joinList(readingNextSteps.concat(speakingNextSteps))}.`);
  }

  // Closing
  parts.push(`Overall, it was a positive session and we look forward to supporting ${studentName}'s learning journey.`);

  return parts.join(' ');
}

function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}

export function useSaveTrialReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      trialId: string;
      readingLevel: string;
      speakingLevel: string;
      selectedComments: { commentId: string; skill: string; type: string; text: string }[];
      studentName: string;
    }) => {
      const readingStrengths = input.selectedComments
        .filter(c => c.skill === 'reading' && c.type === 'strength')
        .map(c => c.text);
      const readingNextSteps = input.selectedComments
        .filter(c => c.skill === 'reading' && c.type === 'next_step')
        .map(c => c.text);
      const speakingStrengths = input.selectedComments
        .filter(c => c.skill === 'speaking' && c.type === 'strength')
        .map(c => c.text);
      const speakingNextSteps = input.selectedComments
        .filter(c => c.skill === 'speaking' && c.type === 'next_step')
        .map(c => c.text);

      const templateText = buildTemplateParagraph(
        input.studentName,
        readingStrengths,
        readingNextSteps,
        speakingStrengths,
        speakingNextSteps
      );

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('trial_reports')
        .insert({
          trial_id: input.trialId,
          reading_level: input.readingLevel,
          speaking_level: input.speakingLevel,
          selected_comments: input.selectedComments,
          template_text: templateText,
          final_text: templateText,
          generated_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trial-reports', variables.trialId] });
    },
  });
}

export function usePolishReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reportId: string; trialId: string; templateText: string; studentName: string }) => {
      const { data, error } = await supabase.functions.invoke('polish-trial-report', {
        body: { template_text: input.templateText, student_name: input.studentName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const polishedText = data.polished_text;

      const { error: updateError } = await supabase
        .from('trial_reports')
        .update({ ai_polished_text: polishedText, final_text: polishedText, updated_at: new Date().toISOString() })
        .eq('report_id', input.reportId);

      if (updateError) throw updateError;
      return polishedText;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trial-reports', variables.trialId] });
    },
  });
}
