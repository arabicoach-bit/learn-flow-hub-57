-- Attach missing trial sync triggers so admin and teacher trial views stay consistent
DROP TRIGGER IF EXISTS trg_audit_trial_lesson_status ON public.trial_lessons_log;
CREATE TRIGGER trg_audit_trial_lesson_status
BEFORE UPDATE ON public.trial_lessons_log
FOR EACH ROW
EXECUTE FUNCTION public.audit_trial_lesson_status();

DROP TRIGGER IF EXISTS trg_sync_trial_lesson_to_student ON public.trial_lessons_log;
CREATE TRIGGER trg_sync_trial_lesson_to_student
AFTER UPDATE OF status ON public.trial_lessons_log
FOR EACH ROW
EXECUTE FUNCTION public.sync_trial_lesson_to_student();

DROP TRIGGER IF EXISTS trg_audit_trial_student_changes ON public.trial_students;
CREATE TRIGGER trg_audit_trial_student_changes
BEFORE UPDATE ON public.trial_students
FOR EACH ROW
EXECUTE FUNCTION public.audit_trial_student_changes();

DROP TRIGGER IF EXISTS trg_sync_trial_student_to_lesson ON public.trial_students;
CREATE TRIGGER trg_sync_trial_student_to_lesson
AFTER UPDATE OF status ON public.trial_students
FOR EACH ROW
EXECUTE FUNCTION public.sync_trial_student_to_lesson();

DROP TRIGGER IF EXISTS trg_sync_trial_teacher_reassignment ON public.trial_students;
CREATE TRIGGER trg_sync_trial_teacher_reassignment
AFTER UPDATE OF teacher_id, trial_date, trial_time ON public.trial_students
FOR EACH ROW
EXECUTE FUNCTION public.sync_trial_teacher_reassignment();

DROP TRIGGER IF EXISTS trg_notify_trial_completed ON public.trial_students;
CREATE TRIGGER trg_notify_trial_completed
AFTER UPDATE OF status ON public.trial_students
FOR EACH ROW
EXECUTE FUNCTION public.notify_trial_completed();

-- Reconcile existing attendance mismatches using trial lesson rows as the source of truth
UPDATE public.trial_students ts
SET status = CASE tls.status
  WHEN 'completed' THEN 'Completed'::public.trial_status
  WHEN 'absent' THEN 'Absent'::public.trial_status
  ELSE 'Scheduled'::public.trial_status
END,
updated_at = now()
FROM public.trial_lessons_log tls
WHERE tls.trial_student_id = ts.trial_id
  AND ts.status IS DISTINCT FROM CASE tls.status
    WHEN 'completed' THEN 'Completed'::public.trial_status
    WHEN 'absent' THEN 'Absent'::public.trial_status
    ELSE 'Scheduled'::public.trial_status
  END;