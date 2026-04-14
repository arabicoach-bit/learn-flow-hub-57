import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads a file to the note-attachments storage bucket.
 * Returns the public URL and filename, or null if upload fails.
 */
export async function uploadNoteAttachment(file: File): Promise<{ url: string; name: string } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from('note-attachments')
      .upload(path, file, { upsert: false });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('note-attachments')
      .getPublicUrl(path);

    return {
      url: urlData.publicUrl,
      name: file.name,
    };
  } catch (err) {
    console.error('Failed to upload attachment:', err);
    return null;
  }
}
