-- Update the mark_lesson_taken function with new wallet thresholds
CREATE OR REPLACE FUNCTION public.mark_lesson_taken(p_student_id uuid, p_class_id uuid, p_teacher_id uuid, p_status text, p_notes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet INTEGER;
  v_current_package UUID;
  v_new_wallet INTEGER;
  v_new_status public.student_status;
  v_package_to_use UUID;
  v_student_name TEXT;
BEGIN
  -- Get student info including name
  SELECT wallet_balance, current_package_id, name INTO v_wallet, v_current_package, v_student_name
  FROM students WHERE student_id = p_student_id;
  
  IF p_status = 'Taken' THEN
    v_new_wallet := v_wallet - 1;
    
    IF v_wallet >= 1 THEN
      v_package_to_use := v_current_package;
      UPDATE packages SET lessons_used = lessons_used + 1 
      WHERE package_id = v_current_package;
    ELSE
      v_package_to_use := NULL;
    END IF;
    
    UPDATE students SET wallet_balance = v_new_wallet WHERE student_id = p_student_id;
    
    -- New thresholds: Active (>=3), Grace (2 to -1), Blocked (<=-2)
    IF v_new_wallet >= 3 THEN
      v_new_status := 'Active';
    ELSIF v_new_wallet >= -1 THEN
      v_new_status := 'Grace';
    ELSE
      v_new_status := 'Blocked';
    END IF;
    
    UPDATE students SET status = v_new_status WHERE student_id = p_student_id;
    
    -- Notifications based on new thresholds
    IF v_new_wallet = 2 THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES ('low_balance', p_student_id, 
        'Student ' || v_student_name || ' has only 2 lessons remaining. Renewal needed soon.',
        v_student_name, 2);
    ELSIF v_new_wallet = 0 THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES ('grace_mode', p_student_id, 
        'Student ' || v_student_name || ' has entered grace period (0 lessons). Contact parent immediately.',
        v_student_name, 0);
    ELSIF v_new_wallet <= -2 THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES ('blocked', p_student_id, 
        'URGENT: Student ' || v_student_name || ' has been BLOCKED (wallet: ' || v_new_wallet || '). No lessons can be marked until payment received.',
        v_student_name, v_new_wallet);
    END IF;
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
    'new_status', v_new_status,
    'student_name', v_student_name
  );
END;
$function$;

-- Update system_config max_debt_lessons to -2
UPDATE system_config SET config_value = '-2' WHERE config_key = 'max_debt_lessons';