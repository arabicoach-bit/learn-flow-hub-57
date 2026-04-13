-- Add recommended_level and status columns to trial_reports
ALTER TABLE public.trial_reports
  ADD COLUMN IF NOT EXISTS recommended_level text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
