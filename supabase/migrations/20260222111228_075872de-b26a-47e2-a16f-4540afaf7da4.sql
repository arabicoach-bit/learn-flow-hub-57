
-- Step 1: Rename enum values in student_status
ALTER TYPE public.student_status RENAME VALUE 'Grace' TO 'Temporary Stop';
ALTER TYPE public.student_status RENAME VALUE 'Blocked' TO 'Left';

-- Step 2: Recreate the mark_lesson_taken function with new status values
CREATE OR REPLACE FUNCTION public.mark_lesson_taken(
  p_student_id uuid,
  p_class_id uuid,
  p_teacher_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet INTEGER;
  v_debt INTEGER;
  v_current_package UUID;
  v_new_wallet INTEGER;
  v_new_debt INTEGER;
  v_new_status public.student_status;
  v_package_to_use UUID;
  v_student_name TEXT;
BEGIN
  SELECT wallet_balance, debt_lessons, current_package_id, name 
  INTO v_wallet, v_debt, v_current_package, v_student_name
  FROM students WHERE student_id = p_student_id;
  
  v_new_debt := v_debt;
  
  IF p_status = 'Taken' THEN
    IF v_wallet > 0 THEN
      v_new_wallet := v_wallet - 1;
      v_package_to_use := v_current_package;
      UPDATE packages SET lessons_used = lessons_used + 1 
      WHERE package_id = v_current_package;
    ELSE
      v_new_wallet := 0;
      v_new_debt := v_debt + 1;
      v_package_to_use := NULL;
    END IF;
    
    UPDATE students SET wallet_balance = v_new_wallet, debt_lessons = v_new_debt WHERE student_id = p_student_id;
    
    IF v_new_wallet >= 3 THEN
      v_new_status := 'Active';
    ELSIF v_new_debt >= 2 THEN
      v_new_status := 'Left';
    ELSE
      v_new_status := 'Temporary Stop';
    END IF;
    
    UPDATE students SET status = v_new_status WHERE student_id = p_student_id;
    
    IF v_new_wallet = 2 AND v_new_debt = 0 THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES ('low_balance', p_student_id, 
        'Student ' || v_student_name || ' has only 2 lessons remaining. Renewal needed soon.',
        v_student_name, 2);
    ELSIF v_new_wallet = 0 AND v_new_debt = 0 THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES ('grace_mode', p_student_id, 
        'Student ' || v_student_name || ' has 0 lessons remaining. Contact parent immediately.',
        v_student_name, 0);
    ELSIF v_new_debt >= 2 THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES ('blocked', p_student_id, 
        'URGENT: Student ' || v_student_name || ' has LEFT (' || v_new_debt || ' overdue lessons). No lessons can be marked until payment received.',
        v_student_name, 0);
    END IF;
  ELSIF p_status = 'Absent' THEN
    v_new_wallet := v_wallet;
    v_package_to_use := v_current_package;
    SELECT status INTO v_new_status FROM students WHERE student_id = p_student_id;
  ELSE
    v_package_to_use := NULL;
    v_new_wallet := v_wallet;
    SELECT status INTO v_new_status FROM students WHERE student_id = p_student_id;
  END IF;
  
  INSERT INTO lessons_log (student_id, class_id, teacher_id, status, package_id_used, notes, lesson_date)
  VALUES (p_student_id, p_class_id, p_teacher_id, p_status::public.lesson_status, v_package_to_use, p_notes, CURRENT_DATE);
  
  RETURN json_build_object(
    'success', true,
    'new_wallet', v_new_wallet,
    'new_debt', v_new_debt,
    'new_status', v_new_status,
    'student_name', v_student_name
  );
END;
$$;
