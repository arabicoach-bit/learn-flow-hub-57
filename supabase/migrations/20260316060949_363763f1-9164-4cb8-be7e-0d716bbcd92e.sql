
-- Bidirectional sync trigger: trial_lessons_log.status -> trial_students.status
-- When teacher marks attendance in trial_lessons_log, sync to trial_students

CREATE OR REPLACE FUNCTION public.sync_trial_lesson_to_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mapped_status text;
BEGIN
  -- Only act on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Map trial_lessons_log status to trial_students status enum
  CASE NEW.status
    WHEN 'completed' THEN v_mapped_status := 'Completed';
    WHEN 'absent' THEN v_mapped_status := 'Absent';
    WHEN 'scheduled' THEN v_mapped_status := 'Scheduled';
    ELSE v_mapped_status := 'Scheduled';
  END CASE;

  UPDATE trial_students
  SET status = v_mapped_status::trial_status,
      updated_at = now()
  WHERE trial_id = NEW.trial_student_id;

  RETURN NEW;
END;
$$;

-- Drop if exists, then create trigger
DROP TRIGGER IF EXISTS trg_sync_trial_lesson_to_student ON trial_lessons_log;
CREATE TRIGGER trg_sync_trial_lesson_to_student
  AFTER UPDATE OF status ON trial_lessons_log
  FOR EACH ROW
  EXECUTE FUNCTION sync_trial_lesson_to_student();

-- Reverse sync: trial_students.status -> trial_lessons_log.status
-- When admin updates attendance on trial_students, sync to trial_lessons_log

CREATE OR REPLACE FUNCTION public.sync_trial_student_to_lesson()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mapped_status text;
BEGIN
  -- Only act on status changes (attendance dimension)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Map trial_students status enum to trial_lessons_log status
  CASE NEW.status::text
    WHEN 'Completed' THEN v_mapped_status := 'completed';
    WHEN 'Absent' THEN v_mapped_status := 'absent';
    WHEN 'Scheduled' THEN v_mapped_status := 'scheduled';
    ELSE RETURN NEW; -- Converted/Lost are conversion statuses, not attendance
  END CASE;

  -- Update all lesson log entries for this trial student that match the old status
  UPDATE trial_lessons_log
  SET status = v_mapped_status
  WHERE trial_student_id = NEW.trial_id
    AND trial_lessons_log.status = CASE OLD.status::text
      WHEN 'Completed' THEN 'completed'
      WHEN 'Absent' THEN 'absent'
      WHEN 'Scheduled' THEN 'scheduled'
      ELSE OLD.status::text
    END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_trial_student_to_lesson ON trial_students;
CREATE TRIGGER trg_sync_trial_student_to_lesson
  AFTER UPDATE OF status ON trial_students
  FOR EACH ROW
  EXECUTE FUNCTION sync_trial_student_to_lesson();

-- Also sync teacher_id changes: when admin reassigns teacher on trial_students
CREATE OR REPLACE FUNCTION public.sync_trial_teacher_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.teacher_id IS DISTINCT FROM NEW.teacher_id THEN
    -- Update all scheduled lesson log entries to the new teacher
    UPDATE trial_lessons_log
    SET teacher_id = NEW.teacher_id
    WHERE trial_student_id = NEW.trial_id
      AND trial_lessons_log.status = 'scheduled';
  END IF;

  -- Sync date/time changes
  IF OLD.trial_date IS DISTINCT FROM NEW.trial_date OR OLD.trial_time IS DISTINCT FROM NEW.trial_time THEN
    UPDATE trial_lessons_log
    SET lesson_date = COALESCE(NEW.trial_date, lesson_date),
        lesson_time = NEW.trial_time
    WHERE trial_student_id = NEW.trial_id
      AND trial_lessons_log.status = 'scheduled';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_trial_teacher_reassignment ON trial_students;
CREATE TRIGGER trg_sync_trial_teacher_reassignment
  AFTER UPDATE OF teacher_id, trial_date, trial_time ON trial_students
  FOR EACH ROW
  EXECUTE FUNCTION sync_trial_teacher_reassignment();
