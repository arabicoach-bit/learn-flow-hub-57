
-- Fix mark_lesson_taken: remove the legacy lessons_used +1 increment
-- The wallet trigger already handles everything; lessons_used column drifts and causes confusion
CREATE OR REPLACE FUNCTION public.mark_lesson_taken(p_student_id uuid, p_teacher_id uuid, p_status text, p_notes text DEFAULT NULL::text)
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
  v_pkg_used INTEGER;
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

  -- Sync lessons_used from actual lesson count (no more +1 increment)
  IF v_current_package IS NOT NULL THEN
    SELECT COUNT(*) INTO v_pkg_used
    FROM scheduled_lessons
    WHERE package_id = v_current_package
      AND status IN ('completed', 'absent');
    
    UPDATE packages SET lessons_used = v_pkg_used WHERE package_id = v_current_package;
  END IF;

  -- Read current wallet (already updated by trigger at this point)
  SELECT wallet_balance, debt_lessons, status::text
  INTO v_wallet, v_debt, v_new_status
  FROM students WHERE student_id = p_student_id;

  -- Notifications for completed lessons
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

  -- Low balance / grace / blocked notifications
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

  -- Package completion check
  IF v_current_package IS NOT NULL THEN
    SELECT COUNT(*) FILTER (WHERE status IN ('completed', 'absent')), lessons_purchased
    INTO v_pkg_used, v_pkg_lessons_purchased
    FROM scheduled_lessons sl
    JOIN packages pk ON pk.package_id = v_current_package
    WHERE sl.package_id = v_current_package
    GROUP BY pk.lessons_purchased;

    SELECT COUNT(*) INTO v_remaining_scheduled
    FROM scheduled_lessons
    WHERE package_id = v_current_package
    AND status = 'scheduled';

    IF v_pkg_used >= v_pkg_lessons_purchased 
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
$function$;

-- BULK RECALCULATE: Fix all student wallets and sync lessons_used on all packages
DO $$
DECLARE
  v_student RECORD;
  v_pkg RECORD;
  v_wallet INTEGER;
  v_used INTEGER;
BEGIN
  FOR v_student IN SELECT student_id FROM students
  LOOP
    v_wallet := 0;
    
    FOR v_pkg IN 
      SELECT package_id, lessons_purchased 
      FROM packages 
      WHERE student_id = v_student.student_id AND status = 'Active'
    LOOP
      SELECT COUNT(*) INTO v_used
      FROM scheduled_lessons
      WHERE package_id = v_pkg.package_id
        AND status IN ('completed', 'absent');
      
      -- Sync lessons_used on the package
      UPDATE packages SET lessons_used = v_used WHERE package_id = v_pkg.package_id;
      
      v_wallet := v_wallet + GREATEST(0, v_pkg.lessons_purchased - v_used);
    END LOOP;
    
    UPDATE students SET wallet_balance = v_wallet WHERE student_id = v_student.student_id;
    
    -- Sync wallet_deducted flags
    UPDATE scheduled_lessons
    SET wallet_deducted = true, wallet_deducted_at = COALESCE(wallet_deducted_at, now())
    WHERE student_id = v_student.student_id AND status = 'completed' AND wallet_deducted = false;
    
    UPDATE scheduled_lessons
    SET wallet_deducted = false, wallet_deducted_at = NULL
    WHERE student_id = v_student.student_id AND status != 'completed' AND wallet_deducted = true;
  END LOOP;
END;
$$;
