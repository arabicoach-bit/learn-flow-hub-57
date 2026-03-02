
-- 1. Update mark_lesson_taken to stop inserting into lessons_log
CREATE OR REPLACE FUNCTION public.mark_lesson_taken(p_student_id uuid, p_class_id uuid, p_teacher_id uuid, p_status text, p_notes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_package UUID;
  v_student_name TEXT;
  v_wallet INTEGER;
  v_debt INTEGER;
  v_new_status TEXT;
BEGIN
  SELECT current_package_id, name
  INTO v_current_package, v_student_name
  FROM students WHERE student_id = p_student_id;

  IF p_status = 'Taken' AND v_current_package IS NOT NULL THEN
    UPDATE packages SET lessons_used = lessons_used + 1 WHERE package_id = v_current_package;
  END IF;

  -- No longer insert into lessons_log (table removed)

  PERFORM recalculate_student_wallet(p_student_id);

  SELECT wallet_balance, debt_lessons, status::text
  INTO v_wallet, v_debt, v_new_status
  FROM students WHERE student_id = p_student_id;

  IF p_status IN ('Taken', 'Absent') THEN
    IF v_wallet = 2 AND v_debt = 0 THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES ('low_balance', p_student_id, 'Student ' || v_student_name || ' has only 2 lessons remaining.', v_student_name, 2);
    ELSIF v_wallet = 0 AND v_debt = 0 THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES ('grace_mode', p_student_id, 'Student ' || v_student_name || ' has 0 lessons remaining.', v_student_name, 0);
    ELSIF v_debt >= 2 THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES ('blocked', p_student_id, 'URGENT: ' || v_student_name || ' has LEFT (' || v_debt || ' overdue lessons).', v_student_name, 0);
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'new_wallet', v_wallet, 'new_debt', v_debt, 'new_status', v_new_status, 'student_name', v_student_name);
END;
$function$;

-- 2. Update generate_package_summary to use scheduled_lessons instead of lessons_log
CREATE OR REPLACE FUNCTION public.generate_package_summary(p_package_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_summary JSON;
BEGIN
  SELECT json_build_object(
    'package_id', p.package_id,
    'student_name', s.name,
    'student_phone', s.phone,
    'parent_phone', s.parent_phone,
    'amount', p.amount,
    'lessons_purchased', p.lessons_purchased,
    'lessons_used', p.lessons_used,
    'payment_date', p.payment_date,
    'completed_date', p.completed_date,
    'status', p.status,
    'lessons', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'date', sl.scheduled_date,
          'class_name', COALESCE(c.name, 'N/A'),
          'teacher_name', COALESCE(t.name, 'N/A'),
          'status', sl.status,
          'notes', sl.notes
        ) ORDER BY sl.scheduled_date
      ), '[]'::json)
      FROM scheduled_lessons sl
      LEFT JOIN classes c ON sl.class_id = c.class_id
      LEFT JOIN teachers t ON sl.teacher_id = t.teacher_id
      WHERE sl.package_id = p.package_id
    ),
    'statistics', json_build_object(
      'total_taken', (SELECT COUNT(*) FROM scheduled_lessons WHERE package_id = p.package_id AND status = 'completed'),
      'total_absent', (SELECT COUNT(*) FROM scheduled_lessons WHERE package_id = p.package_id AND status = 'absent'),
      'total_scheduled', (SELECT COUNT(*) FROM scheduled_lessons WHERE package_id = p.package_id AND status = 'scheduled')
    )
  ) INTO v_summary
  FROM packages p
  JOIN students s ON p.student_id = s.student_id
  WHERE p.package_id = p_package_id;

  RETURN v_summary;
END;
$function$;

-- 3. Drop lessons_log table (triggers on it will be dropped automatically)
DROP TABLE IF EXISTS public.lessons_log CASCADE;
