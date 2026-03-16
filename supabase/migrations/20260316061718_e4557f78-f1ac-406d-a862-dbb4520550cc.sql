
-- Add audit tracking columns to trial_students
ALTER TABLE public.trial_students
  ADD COLUMN IF NOT EXISTS attendance_updated_by uuid,
  ADD COLUMN IF NOT EXISTS attendance_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS conversion_updated_by uuid,
  ADD COLUMN IF NOT EXISTS conversion_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_updated_by uuid;

-- Add audit tracking to trial_lessons_log
ALTER TABLE public.trial_lessons_log
  ADD COLUMN IF NOT EXISTS status_updated_by uuid,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;

-- Trigger: auto-stamp attendance audit on trial_students
CREATE OR REPLACE FUNCTION public.audit_trial_student_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Track who made the update
  NEW.last_updated_by := auth.uid();
  NEW.updated_at := now();

  -- Attendance changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.attendance_updated_by := auth.uid();
    NEW.attendance_updated_at := now();
  END IF;

  -- Conversion changed
  IF OLD.conversion_status IS DISTINCT FROM NEW.conversion_status
     OR OLD.trial_result IS DISTINCT FROM NEW.trial_result THEN
    NEW.conversion_updated_by := auth.uid();
    NEW.conversion_updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_trial_student_changes ON trial_students;
CREATE TRIGGER trg_audit_trial_student_changes
  BEFORE UPDATE ON trial_students
  FOR EACH ROW
  EXECUTE FUNCTION audit_trial_student_changes();

-- Trigger: auto-stamp attendance audit on trial_lessons_log
CREATE OR REPLACE FUNCTION public.audit_trial_lesson_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_by := auth.uid();
    NEW.status_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_trial_lesson_status ON trial_lessons_log;
CREATE TRIGGER trg_audit_trial_lesson_status
  BEFORE UPDATE ON trial_lessons_log
  FOR EACH ROW
  EXECUTE FUNCTION audit_trial_lesson_status();
