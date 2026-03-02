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
  v_teacher_name TEXT;
  v_lessons_purchased INTEGER;
  v_existing_notif UUID;
  v_remaining_scheduled INTEGER;
  v_pkg_lessons_used INTEGER;
  v_pkg_lessons_purchased INTEGER;
BEGIN
  SELECT current_package_id, name
  INTO v_current_package, v_student_name
  FROM students WHERE student_id = p_student_id;

  SELECT name INTO v_teacher_name
  FROM teachers WHERE teacher_id = p_teacher_id;

  IF v_current_package IS NOT NULL THEN
    SELECT lessons_purchased INTO v_lessons_purchased
    FROM packages WHERE package_id = v_current_package;
  END IF;

  IF p_status = 'completed' AND v_current_package IS NOT NULL THEN
    UPDATE packages SET lessons_used = lessons_used + 1 WHERE package_id = v_current_package;
  END IF;

  PERFORM recalculate_student_wallet(p_student_id);

  SELECT wallet_balance, debt_lessons, status::text
  INTO v_wallet, v_debt, v_new_status
  FROM students WHERE student_id = p_student_id;

  -- Insert lesson_completed notification
  IF p_status = 'completed' THEN
    INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
    VALUES (
      'lesson_completed',
      p_student_id,
      '✅ Lesson completed for ' || v_student_name ||
      ' | 👨‍🏫 Teacher: ' || COALESCE(v_teacher_name, 'N/A') ||
      ' | 📝 Notes: ' || COALESCE(p_notes, '-') ||
      ' | 📚 Remaining: ' || v_wallet ||
      ' out of ' || COALESCE(v_lessons_purchased::text, '?') ||
      ' lessons' ||
      CASE
        WHEN v_wallet = 0 THEN ' | 🚨 Urgent renewal'
        WHEN v_wallet <= 2 THEN ' | ⚠️ Low credit'
        ELSE ''
      END,
      v_student_name,
      v_wallet
    );
  END IF;

  -- Wallet status notifications with duplicate checks
  IF p_status IN ('completed', 'absent') THEN
    IF v_wallet = 2 AND v_debt = 0 THEN
      SELECT notification_id INTO v_existing_notif
      FROM notifications
      WHERE type = 'low_balance' AND related_id = p_student_id AND is_read = false AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1;
      IF v_existing_notif IS NULL THEN
        INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
        VALUES ('low_balance', p_student_id, 'Student ' || v_student_name || ' has only 2 lessons remaining.', v_student_name, 2);
      END IF;
    ELSIF v_wallet = 0 AND v_debt = 0 THEN
      SELECT notification_id INTO v_existing_notif
      FROM notifications
      WHERE type = 'grace_mode' AND related_id = p_student_id AND is_read = false AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1;
      IF v_existing_notif IS NULL THEN
        INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
        VALUES ('grace_mode', p_student_id, 'Student ' || v_student_name || ' has 0 lessons remaining.', v_student_name, 0);
      END IF;
    ELSIF v_debt >= 2 THEN
      SELECT notification_id INTO v_existing_notif
      FROM notifications
      WHERE type = 'blocked' AND related_id = p_student_id AND is_read = false AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1;
      IF v_existing_notif IS NULL THEN
        INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
        VALUES ('blocked', p_student_id, 'URGENT: ' || v_student_name || ' has LEFT (' || v_debt || ' overdue lessons).', v_student_name, 0);
      END IF;
    END IF;
  END IF;

  -- Auto-complete package when all lessons done
  IF v_current_package IS NOT NULL THEN
    SELECT lessons_used, lessons_purchased
    INTO v_pkg_lessons_used, v_pkg_lessons_purchased
    FROM packages 
    WHERE package_id = v_current_package;

    SELECT COUNT(*) INTO v_remaining_scheduled
    FROM scheduled_lessons
    WHERE package_id = v_current_package
    AND status = 'scheduled';

    IF v_pkg_lessons_used >= v_pkg_lessons_purchased 
       OR v_remaining_scheduled = 0 THEN
      UPDATE packages
      SET 
        status = 'Completed',
        completed_date = COALESCE(completed_date, CURRENT_DATE)
      WHERE package_id = v_current_package
      AND status = 'Active';
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'new_wallet', v_wallet, 'new_debt', v_debt, 'new_status', v_new_status, 'student_name', v_student_name);
END;
$function$