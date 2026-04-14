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

async function getCurrentUser(): Promise<{ id: string | null; name: string | null }> {
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.id) return { id: null, name: null };
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', data.user.id)
    .single();
  
  return { id: data.user.id, name: profile?.full_name || null };
}

const tableMap: Record<EntityType, string> = {
  student: 'student_comments',
  trial: 'trial_comments',
  package: 'package_comments',
  lead: 'lead_comments',
};

const idColMap: Record<EntityType, string> = {
  student: 'student_id',
  trial: 'trial_id',
  package: 'package_id',
  lead: 'lead_id',
};

export async function logActivityComment({ entityType, entityId, action, details }: ActivityLogEntry) {
  try {
    const user = await getCurrentUser();
    const message = details ? `🔄 ${action}\n${details}` : `🔄 ${action}`;

    await supabase.from(tableMap[entityType] as any).insert({
      [idColMap[entityType]]: entityId,
      author_id: user.id,
      comment: message,
    } as any);
  } catch (err) {
    console.error('Failed to log activity comment:', err);
  }
}

/**
 * Logs a creation event with the admin's name prominently displayed.
 * Uses 📋 prefix to distinguish from regular activity logs.
 */
export async function logCreationEvent(
  entityType: EntityType,
  entityId: string,
  entityLabel: string,
  details?: string,
) {
  try {
    const user = await getCurrentUser();
    const adminName = user.name || 'Unknown';
    const message = `📋 Created by ${adminName}${details ? `\n${details}` : ''}`;

    await supabase.from(tableMap[entityType] as any).insert({
      [idColMap[entityType]]: entityId,
      author_id: user.id,
      comment: message,
    } as any);
  } catch (err) {
    console.error('Failed to log creation event:', err);
  }
}

/**
 * Logs a journey link across entities (Lead→Trial, Trial→Student).
 * Creates a 🔗 entry in both the source and destination comment threads.
 */
export async function logJourneyLink(
  source: { type: EntityType; id: string; label: string },
  destination: { type: EntityType; id: string; label: string },
  action: string,
) {
  try {
    const user = await getCurrentUser();
    const adminName = user.name || 'Unknown';
    const sourceMsg = `🔗 ${action} by ${adminName}\n→ Linked to ${destination.type}: ${destination.label}`;
    const destMsg = `🔗 ${action} by ${adminName}\n← Linked from ${source.type}: ${source.label}`;

    await supabase.from(tableMap[source.type] as any).insert({
      [idColMap[source.type]]: source.id,
      author_id: user.id,
      comment: sourceMsg,
    } as any);

    await supabase.from(tableMap[destination.type] as any).insert({
      [idColMap[destination.type]]: destination.id,
      author_id: user.id,
      comment: destMsg,
    } as any);
  } catch (err) {
    console.error('Failed to log journey link:', err);
  }
}

// ──── Helper: get teacher name ────

async function getTeacherName(teacherId: string): Promise<string> {
  const { data } = await supabase
    .from('teachers')
    .select('name')
    .eq('teacher_id', teacherId)
    .single();
  return data?.name || 'Unknown Teacher';
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

/**
 * Logs lesson completion/absence with the teacher's name into both
 * student notes and package notes (if package_id is available).
 */
export async function logLessonMarked(params: {
  studentId: string;
  teacherId: string;
  packageId?: string | null;
  status: 'completed' | 'absent';
  date: string;
  time: string;
  notes?: string | null;
}) {
  try {
    const teacherName = await getTeacherName(params.teacherId);
    const statusLabel = params.status === 'completed' ? '✅ Completed' : '❌ Absent';
    const action = `Lesson ${statusLabel} — by ${teacherName}`;
    const details = `Date: ${params.date} | Time: ${params.time}${params.notes ? `\nNotes: ${params.notes}` : ''}`;

    // Log to student notes
    logStudentActivity(params.studentId, action, details);

    // Log to package notes
    if (params.packageId) {
      logPackageActivity(params.packageId, action, details);
    }
  } catch (err) {
    console.error('Failed to log lesson marked:', err);
  }
}
