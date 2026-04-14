import { supabase } from '@/integrations/supabase/client';

/**
 * Parses @mentions from comment text and creates notifications for mentioned admins.
 * Mention format: @Name (matches against profiles.full_name)
 */
export async function processMentions(comment: string, entityType: string, entityLabel: string) {
  try {
    // Extract @mentions — match @Name (1+ words after @, until end of word boundary or next @)
    const mentionPattern = /@([A-Za-z][A-Za-z\s]*?)(?=\s@|\s🔄|\s🔗|\s📋|$|\n|,|\.|\))/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionPattern.exec(comment)) !== null) {
      mentions.push(match[1].trim());
    }

    if (mentions.length === 0) return;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Look up mentioned admin profiles
    for (const mentionName of mentions) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', `%${mentionName}%`)
        .neq('id', user.id);

      if (!profiles?.length) continue;

      for (const profile of profiles) {
        // Check if they're an admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!roleData) continue;

        // Create notification
        await supabase.from('notifications').insert({
          type: 'daily_summary' as any, // reuse existing type
          message: `💬 ${currentProfile?.full_name || 'Someone'} mentioned you in ${entityType} notes (${entityLabel}): "${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}"`,
          student_name: entityLabel,
        });
      }
    }
  } catch (err) {
    console.error('Failed to process mentions:', err);
  }
}
