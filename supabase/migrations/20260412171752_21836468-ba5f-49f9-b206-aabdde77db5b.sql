
-- Remove level check constraint
ALTER TABLE report_comment_bank DROP CONSTRAINT IF EXISTS report_comment_bank_level_check;

-- Add teacher_notes to trial_reports
ALTER TABLE trial_reports ADD COLUMN IF NOT EXISTS teacher_notes text;
