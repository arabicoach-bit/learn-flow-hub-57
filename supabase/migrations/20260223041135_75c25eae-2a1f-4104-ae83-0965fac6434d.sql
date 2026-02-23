
-- Drop the old incorrect constraint
ALTER TABLE scheduled_lessons DROP CONSTRAINT IF EXISTS scheduled_lessons_status_check;

-- Clean existing data
UPDATE scheduled_lessons SET status = 'scheduled' WHERE status IS NULL OR status = 'rescheduled';
UPDATE scheduled_lessons SET status = 'completed' WHERE status IN ('taken', 'Taken');
UPDATE scheduled_lessons SET status = 'absent' WHERE status IN ('cancelled', 'Cancelled');

-- Add correct constraint
ALTER TABLE scheduled_lessons 
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'scheduled';

ALTER TABLE scheduled_lessons 
  ADD CONSTRAINT scheduled_lessons_status_check 
  CHECK (status IN ('scheduled', 'completed', 'absent'));

-- Create recalculate_student_wallet function
CREATE OR REPLACE FUNCTION public.recalculate_student_wallet(p_student_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_purchased INTEGER;
  v_total_used INTEGER;
  v_wallet INTEGER;
  v_debt INTEGER;
  v_new_status public.student_status;
BEGIN
  SELECT COALESCE(SUM(lessons_purchased), 0)
  INTO v_total_purchased
  FROM packages WHERE student_id = p_student_id;

  SELECT COUNT(*)
  INTO v_total_used
  FROM scheduled_lessons
  WHERE student_id = p_student_id AND status IN ('completed', 'absent');

  IF v_total_used <= v_total_purchased THEN
    v_wallet := v_total_purchased - v_total_used;
    v_debt := 0;
  ELSE
    v_wallet := 0;
    v_debt := v_total_used - v_total_purchased;
  END IF;

  IF v_wallet >= 1 THEN v_new_status := 'Active';
  ELSIF v_debt >= 2 THEN v_new_status := 'Left';
  ELSE v_new_status := 'Temporary Stop';
  END IF;

  UPDATE students
  SET wallet_balance = v_wallet, debt_lessons = v_debt, status = v_new_status
  WHERE student_id = p_student_id;

  RETURN json_build_object(
    'success', true, 'total_purchased', v_total_purchased,
    'total_used', v_total_used, 'wallet', v_wallet,
    'debt', v_debt, 'status', v_new_status
  );
END;
$$;

-- Update mark_lesson_taken to use recalculate_student_wallet
CREATE OR REPLACE FUNCTION public.mark_lesson_taken(
  p_student_id uuid, p_class_id uuid, p_teacher_id uuid,
  p_status text, p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  INSERT INTO lessons_log (student_id, class_id, teacher_id, status, package_id_used, notes, lesson_date)
  VALUES (p_student_id, p_class_id, p_teacher_id, p_status::public.lesson_status, v_current_package, p_notes, CURRENT_DATE);

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
$$;

-- Update add_package_with_debt to use recalculate_student_wallet
CREATE OR REPLACE FUNCTION public.add_package_with_debt(
  p_student_id uuid, p_amount numeric, p_lessons_purchased integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_package_id UUID;
  v_old_wallet INTEGER;
  v_old_debt INTEGER;
  v_new_wallet INTEGER;
  v_new_debt INTEGER;
BEGIN
  SELECT wallet_balance, debt_lessons INTO v_old_wallet, v_old_debt
  FROM students WHERE student_id = p_student_id;

  INSERT INTO packages (student_id, amount, lessons_purchased, lessons_used)
  VALUES (p_student_id, p_amount, p_lessons_purchased, 0)
  RETURNING package_id INTO v_package_id;

  UPDATE students SET current_package_id = v_package_id WHERE student_id = p_student_id;

  PERFORM recalculate_student_wallet(p_student_id);

  SELECT wallet_balance, debt_lessons INTO v_new_wallet, v_new_debt
  FROM students WHERE student_id = p_student_id;

  RETURN json_build_object('success', true, 'package_id', v_package_id,
    'old_wallet', v_old_wallet, 'old_debt', v_old_debt,
    'new_wallet', v_new_wallet, 'new_debt', v_new_debt,
    'debt_covered', GREATEST(0, v_old_debt - v_new_debt));
END;
$$;
