import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CommentBankEntry {
  comment_id: string;
  skill: 'reading' | 'speaking';
  level: string;
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
  teacher_notes: string | null;
  generated_by: string | null;
  recommended_level: string | null;
  status: string;
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

function personalizeComment(text: string, name: string, gender?: string): string {
  let result = text.replace(/\bThe student\b/g, name).replace(/\bthe student\b/g, name);
  const isMale = gender?.toLowerCase() === 'male';
  const isFemale = gender?.toLowerCase() === 'female';
  if (isMale) {
    result = result.replace(/\b(he|she)\b/g, 'he').replace(/\b(He|She)\b/g, 'He')
      .replace(/\b(his|her)\b/g, 'his').replace(/\b(His|Her)\b/g, 'His');
  } else if (isFemale) {
    result = result.replace(/\b(he|she)\b/g, 'she').replace(/\b(He|She)\b/g, 'She')
      .replace(/\b(his|her)\b/g, 'her').replace(/\b(His|Her)\b/g, 'Her');
  }
  return result;
}

function stripStudentName(text: string, name: string): string {
  let result = text;
  result = result.replace(new RegExp(`^${name}\\s+`, 'i'), '');
  result = result.replace(/^The student\s+/i, '');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function buildTemplateParagraph(
  studentName: string,
  readingStrengths: string[],
  readingNextSteps: string[],
  speakingStrengths: string[],
  speakingNextSteps: string[],
  teacherNotes?: string,
  gender?: string
): string {
  const p = (t: string) => personalizeComment(t, studentName, gender);
  const pronoun = gender?.toLowerCase() === 'female' ? 'she' : gender?.toLowerCase() === 'male' ? 'he' : 'the student';
  const formatBullets = (items: string[]) =>
    items.map(s => '• ' + stripStudentName(p(s), studentName)).join('\n');

  const parts: string[] = [];

  if (readingStrengths.length > 0) {
    parts.push(`Reading — Strengths:\n${studentName} demonstrated strong skills in the following areas:\n${formatBullets(readingStrengths)}`);
  }
  if (readingNextSteps.length > 0) {
    parts.push(`Reading — Next Steps:\nTo continue progressing, ${pronoun} should focus on:\n${formatBullets(readingNextSteps)}`);
  }
  if (speakingStrengths.length > 0) {
    parts.push(`Conversation (Speaking & Listening) — Strengths:\n${studentName} showed confidence in the following areas:\n${formatBullets(speakingStrengths)}`);
  }
  if (speakingNextSteps.length > 0) {
    parts.push(`Conversation (Speaking & Listening) — Next Steps:\nTo develop further, ${pronoun} should work on:\n${formatBullets(speakingNextSteps)}`);
  }
  if (teacherNotes?.trim()) {
    parts.push('Teacher Notes:\n' + teacherNotes.trim());
  }

  return parts.join('\n\n');
}

export function useUpdateTrialReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      reportId: string;
      trialId: string;
      selectedComments: { commentId: string; skill: string; type: string; text: string }[];
      studentName: string;
      teacherNotes?: string;
      gender?: string;
      finalText?: string;
      recommendedLevel?: string;
      status?: string;
    }) => {
      const readingStrengths = input.selectedComments.filter(c => c.skill === 'reading' && c.type === 'strength').map(c => c.text);
      const readingNextSteps = input.selectedComments.filter(c => c.skill === 'reading' && c.type === 'next_step').map(c => c.text);
      const speakingStrengths = input.selectedComments.filter(c => c.skill === 'speaking' && c.type === 'strength').map(c => c.text);
      const speakingNextSteps = input.selectedComments.filter(c => c.skill === 'speaking' && c.type === 'next_step').map(c => c.text);

      const templateText = buildTemplateParagraph(input.studentName, readingStrengths, readingNextSteps, speakingStrengths, speakingNextSteps, input.teacherNotes, input.gender);
      const finalText = input.finalText || templateText;

      const updateData: Record<string, any> = {
        selected_comments: input.selectedComments,
        template_text: templateText,
        final_text: finalText,
        teacher_notes: input.teacherNotes || null,
        updated_at: new Date().toISOString(),
      };
      if (input.recommendedLevel !== undefined) updateData.recommended_level = input.recommendedLevel || null;
      if (input.status !== undefined) updateData.status = input.status;

      const { data, error } = await supabase
        .from('trial_reports')
        .update(updateData)
        .eq('report_id', input.reportId)
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

export function useSaveTrialReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      trialId: string;
      selectedComments: { commentId: string; skill: string; type: string; text: string }[];
      studentName: string;
      teacherNotes?: string;
      gender?: string;
      recommendedLevel?: string;
    }) => {
      const readingStrengths = input.selectedComments.filter(c => c.skill === 'reading' && c.type === 'strength').map(c => c.text);
      const readingNextSteps = input.selectedComments.filter(c => c.skill === 'reading' && c.type === 'next_step').map(c => c.text);
      const speakingStrengths = input.selectedComments.filter(c => c.skill === 'speaking' && c.type === 'strength').map(c => c.text);
      const speakingNextSteps = input.selectedComments.filter(c => c.skill === 'speaking' && c.type === 'next_step').map(c => c.text);

      const templateText = buildTemplateParagraph(input.studentName, readingStrengths, readingNextSteps, speakingStrengths, speakingNextSteps, input.teacherNotes, input.gender);

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('trial_reports')
        .insert({
          trial_id: input.trialId,
          reading_level: 'general',
          speaking_level: 'general',
          selected_comments: input.selectedComments,
          template_text: templateText,
          final_text: templateText,
          teacher_notes: input.teacherNotes || null,
          generated_by: userData.user?.id || null,
          recommended_level: input.recommendedLevel || null,
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
