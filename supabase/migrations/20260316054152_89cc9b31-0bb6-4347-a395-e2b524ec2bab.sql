
-- Fix recalculate_student_wallet: wallet = count of scheduled lessons, not purchased - used
CREATE OR REPLACE FUNCTION public.recalculate_student_wallet(p_student_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet INTEGER := 0;
  v_pkg RECORD;
  v_used INTEGER;
  v_scheduled_count INTEGER;
BEGIN
  FOR v_pkg IN
    SELECT package_id, lessons_purchased
    FROM packages
    WHERE student_id = p_student_id AND packages.status IN ('Active', 'Completed')
  LOOP
    SELECT COUNT(*) INTO v_used
    FROM scheduled_lessons
    WHERE package_id = v_pkg.package_id
      AND scheduled_lessons.status IN ('completed', 'absent');

    UPDATE packages SET lessons_used = v_used WHERE package_id = v_pkg.package_id;

    SELECT COUNT(*) INTO v_scheduled_count
    FROM scheduled_lessons
    WHERE package_id = v_pkg.package_id
      AND scheduled_lessons.status = 'scheduled';

    v_wallet := v_wallet + v_scheduled_count;

    IF v_scheduled_count = 0 THEN
      UPDATE packages SET status = 'Completed', completed_date = COALESCE(completed_date, CURRENT_DATE)
      WHERE package_id = v_pkg.package_id AND packages.status = 'Active';
    ELSE
      UPDATE packages SET status = 'Active', completed_date = NULL
      WHERE package_id = v_pkg.package_id AND packages.status = 'Completed';
    END IF;
  END LOOP;

  UPDATE students SET wallet_balance = v_wallet WHERE student_id = p_student_id;

  UPDATE scheduled_lessons
  SET wallet_deducted = true, wallet_deducted_at = COALESCE(wallet_deducted_at, now())
  WHERE student_id = p_student_id AND status = 'completed' AND wallet_deducted = false;

  UPDATE scheduled_lessons
  SET wallet_deducted = false, wallet_deducted_at = NULL
  WHERE student_id = p_student_id AND status != 'completed' AND wallet_deducted = true;

  RETURN json_build_object('success', true, 'wallet', v_wallet, 'student_id', p_student_id);
END;
$function$;

-- Fix trigger_wallet_sync_on_status_change: wallet = count of scheduled lessons
CREATE OR REPLACE FUNCTION public.trigger_wallet_sync_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet INTEGER := 0;
  v_pkg RECORD;
  v_used INTEGER;
  v_scheduled_count INTEGER;
BEGIN
  IF OLD.status = NEW.status THEN
    IF NEW.status = 'completed' THEN
      NEW.wallet_deducted := true;
      NEW.wallet_deducted_at := COALESCE(NEW.wallet_deducted_at, now());
    ELSE
      NEW.wallet_deducted := false;
      NEW.wallet_deducted_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' THEN
    NEW.wallet_deducted := true;
    NEW.wallet_deducted_at := now();
  ELSE
    NEW.wallet_deducted := false;
    NEW.wallet_deducted_at := NULL;
  END IF;

  FOR v_pkg IN
    SELECT package_id, lessons_purchased
    FROM packages
    WHERE student_id = NEW.student_id AND packages.status IN ('Active', 'Completed')
  LOOP
    SELECT COUNT(*) INTO v_used
    FROM scheduled_lessons
    WHERE package_id = v_pkg.package_id
      AND scheduled_lessons.status IN ('completed', 'absent')
      AND scheduled_lesson_id != NEW.scheduled_lesson_id;

    IF NEW.package_id = v_pkg.package_id AND NEW.status IN ('completed', 'absent') THEN
      v_used := v_used + 1;
    END IF;

    UPDATE packages SET lessons_used = v_used WHERE package_id = v_pkg.package_id;

    SELECT COUNT(*) INTO v_scheduled_count
    FROM scheduled_lessons
    WHERE package_id = v_pkg.package_id
      AND scheduled_lessons.status = 'scheduled'
      AND scheduled_lesson_id != NEW.scheduled_lesson_id;

    IF NEW.package_id = v_pkg.package_id AND NEW.status = 'scheduled' THEN
      v_scheduled_count := v_scheduled_count + 1;
    END IF;

    v_wallet := v_wallet + v_scheduled_count;

    IF v_scheduled_count = 0 THEN
      UPDATE packages SET status = 'Completed', completed_date = COALESCE(completed_date, CURRENT_DATE)
      WHERE package_id = v_pkg.package_id AND packages.status = 'Active';
    ELSE
      UPDATE packages SET status = 'Active', completed_date = NULL
      WHERE package_id = v_pkg.package_id AND packages.status = 'Completed';
    END IF;
  END LOOP;

  UPDATE public.students SET wallet_balance = v_wallet WHERE student_id = NEW.student_id;
  RETURN NEW;
END;
$function$;

-- Fix mark_lesson_taken: package status by scheduled count only
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
BEGIN
  SELECT current_package_id, name
  INTO v_current_package, v_student_name
  FROM students WHERE student_id = p_student_id;

  SELECT name INTO v_teacher_name
  FROM teachers WHERE teacher_id = p_teacher_id;

  IF v_current_package IS NOT NULL THEN
    SELECT lessons_purchased INTO v_lessons_purchased
    FROM packages WHERE package_id = v_current_package;

    SELECT COUNT(*) INTO v_pkg_used
    FROM scheduled_lessons
    WHERE package_id = v_current_package
      AND scheduled_lessons.status IN ('completed', 'absent');
    
    UPDATE packages SET lessons_used = v_pkg_used WHERE package_id = v_current_package;
  END IF;

  SELECT wallet_balance, debt_lessons, students.status::text
  INTO v_wallet, v_debt, v_new_status
  FROM students WHERE student_id = p_student_id;

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

  IF v_current_package IS NOT NULL THEN
    SELECT COUNT(*) INTO v_remaining_scheduled
    FROM scheduled_lessons
    WHERE package_id = v_current_package
      AND scheduled_lessons.status = 'scheduled';

    IF v_remaining_scheduled = 0 THEN
      UPDATE packages
      SET status = 'Completed',
          completed_date = COALESCE(completed_date, CURRENT_DATE)
      WHERE package_id = v_current_package
        AND packages.status = 'Active';
    ELSE
      UPDATE packages
      SET status = 'Active',
          completed_date = NULL
      WHERE package_id = v_current_package
        AND packages.status = 'Completed';
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'new_wallet', v_wallet, 'new_debt', v_debt, 'new_status', v_new_status, 'student_name', v_student_name);
END;
$function$;

-- Bulk fix: recalculate all students wallets with new logic
DO $$
DECLARE
  v_student RECORD;
BEGIN
  FOR v_student IN SELECT student_id FROM students LOOP
    PERFORM recalculate_student_wallet(v_student.student_id);
  END LOOP;
END $$
