
-- Update mark_lesson_taken to add lesson_completed notification
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
BEGIN
  SELECT current_package_id, name
  INTO v_current_package, v_student_name
  FROM students WHERE student_id = p_student_id;

  -- Get teacher name
  SELECT name INTO v_teacher_name
  FROM teachers WHERE teacher_id = p_teacher_id;

  -- Get lessons purchased from current package
  IF v_current_package IS NOT NULL THEN
    SELECT lessons_purchased INTO v_lessons_purchased
    FROM packages WHERE package_id = v_current_package;
  END IF;

  IF p_status = 'Taken' AND v_current_package IS NOT NULL THEN
    UPDATE packages SET lessons_used = lessons_used + 1 WHERE package_id = v_current_package;
  END IF;

  PERFORM recalculate_student_wallet(p_student_id);

  SELECT wallet_balance, debt_lessons, status::text
  INTO v_wallet, v_debt, v_new_status
  FROM students WHERE student_id = p_student_id;

  -- Insert lesson_completed notification
  IF p_status = 'Taken' THEN
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

-- Create trigger function for trial_students status changes
CREATE OR REPLACE FUNCTION public.notify_trial_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_teacher_name TEXT;
BEGIN
  -- Only fire when status changes to Completed
  IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
    -- Get teacher name
    IF NEW.teacher_id IS NOT NULL THEN
      SELECT name INTO v_teacher_name FROM teachers WHERE teacher_id = NEW.teacher_id;
    END IF;

    INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
    VALUES (
      'trial_completed',
      NEW.trial_id,
      '🎓 Trial completed for ' || NEW.name ||
      ' | 👨‍🏫 Teacher: ' || COALESCE(v_teacher_name, 'N/A') ||
      ' | 📅 Date: ' || COALESCE(NEW.trial_date::text, '-') ||
      ' | 📝 Notes: ' || COALESCE(NEW.notes, '-') ||
      ' | 👉 Action: Update trial result',
      NEW.name,
      0
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_trial_completed ON trial_students;
CREATE TRIGGER trigger_trial_completed
  AFTER UPDATE ON trial_students
  FOR EACH ROW
  EXECUTE FUNCTION notify_trial_completed();

-- Update add_package_with_debt to add new_package notification
CREATE OR REPLACE FUNCTION public.add_package_with_debt(p_student_id uuid, p_amount numeric, p_lessons_purchased integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_package_id UUID;
  v_old_wallet INTEGER;
  v_old_debt INTEGER;
  v_new_wallet INTEGER;
  v_new_debt INTEGER;
  v_student_name TEXT;
  v_teacher_name TEXT;
  v_teacher_id UUID;
BEGIN
  SELECT wallet_balance, debt_lessons, name, teacher_id 
  INTO v_old_wallet, v_old_debt, v_student_name, v_teacher_id
  FROM students WHERE student_id = p_student_id;

  -- Get teacher name
  IF v_teacher_id IS NOT NULL THEN
    SELECT name INTO v_teacher_name FROM teachers WHERE teacher_id = v_teacher_id;
  END IF;

  INSERT INTO packages (student_id, amount, lessons_purchased, lessons_used)
  VALUES (p_student_id, p_amount, p_lessons_purchased, 0)
  RETURNING package_id INTO v_package_id;

  UPDATE students SET current_package_id = v_package_id WHERE student_id = p_student_id;

  PERFORM recalculate_student_wallet(p_student_id);

  SELECT wallet_balance, debt_lessons INTO v_new_wallet, v_new_debt
  FROM students WHERE student_id = p_student_id;

  -- Insert new_package notification
  INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
  VALUES (
    'new_package',
    p_student_id,
    '📦 New package for ' || v_student_name ||
    ' | 👨‍🏫 Teacher: ' || COALESCE(v_teacher_name, 'N/A') ||
    ' | 📚 ' || p_lessons_purchased || ' lessons' ||
    ' | 💰 AED ' || p_amount ||
    ' | 📋 Wallet: ' || v_new_wallet,
    v_student_name,
    v_new_wallet
  );

  RETURN json_build_object('success', true, 'package_id', v_package_id,
    'old_wallet', v_old_wallet, 'old_debt', v_old_debt,
    'new_wallet', v_new_wallet, 'new_debt', v_new_debt,
    'debt_covered', GREATEST(0, v_old_debt - v_new_debt));
END;
$function$;
