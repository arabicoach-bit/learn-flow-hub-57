import { supabase } from '@/integrations/supabase/client';

/**
 * Logs an activity as a comment/note in the respective entity's comment table.
 * This creates an automatic audit trail visible in the Notes tab.
 */

type EntityType = 'student' | 'trial' | 'package' | 'lead';

interface ActivityLogEntry {
  entityType: EntityType;
  entityId: string;
  action: string;
  details?: string;
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export async function logActivityComment({ entityType, entityId, action, details }: ActivityLogEntry) {
  try {
    const userId = await getCurrentUserId();
    const message = details ? `🔄 ${action}\n${details}` : `🔄 ${action}`;

    switch (entityType) {
      case 'student':
        await supabase.from('student_comments').insert({
          student_id: entityId,
          author_id: userId,
          comment: message,
        });
        break;
      case 'trial':
        await supabase.from('trial_comments').insert({
          trial_id: entityId,
          author_id: userId,
          comment: message,
        });
        break;
      case 'package':
        await supabase.from('package_comments').insert({
          package_id: entityId,
          author_id: userId,
          comment: message,
        });
        break;
      case 'lead':
        await supabase.from('lead_comments').insert({
          lead_id: entityId,
          author_id: userId,
          comment: message,
        });
        break;
    }
  } catch (err) {
    console.error('Failed to log activity comment:', err);
    // Silent fail — don't block the main action
  }
}

// ──── Convenience functions ────

export function logTrialActivity(trialId: string, action: string, details?: string) {
  return logActivityComment({ entityType: 'trial', entityId: trialId, action, details });
}

export function logStudentActivity(studentId: string, action: string, details?: string) {
  return logActivityComment({ entityType: 'student', entityId: studentId, action, details });
}

export function logPackageActivity(packageId: string, action: string, details?: string) {
  return logActivityComment({ entityType: 'package', entityId: packageId, action, details });
}

export function logLeadActivity(leadId: string, action: string, details?: string) {
  return logActivityComment({ entityType: 'lead', entityId: leadId, action, details });
}
