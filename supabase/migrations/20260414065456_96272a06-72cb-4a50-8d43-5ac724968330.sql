
-- Add attachment columns to all comment tables
ALTER TABLE public.student_comments
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

ALTER TABLE public.trial_comments
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

ALTER TABLE public.package_comments
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

ALTER TABLE public.lead_comments
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

-- Create storage bucket for note attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-attachments', 'note-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload note attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'note-attachments');

-- Allow public read access
CREATE POLICY "Anyone can view note attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'note-attachments');

-- Allow owners to delete their attachments
CREATE POLICY "Authenticated users can delete own note attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'note-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
