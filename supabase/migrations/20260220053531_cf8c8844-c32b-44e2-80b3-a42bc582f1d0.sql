
-- 1. Add debt_lessons column to students for tracking overdue lessons (wallet clamped to 0)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS debt_lessons integer NOT NULL DEFAULT 0;

-- 2. Fix any existing negative wallets: move negative amount to debt_lessons, clamp wallet to 0
UPDATE public.students 
SET debt_lessons = ABS(wallet_balance), wallet_balance = 0 
WHERE wallet_balance < 0;

-- 3. Migrate rescheduled lessons to scheduled
UPDATE public.scheduled_lessons SET status = 'scheduled' WHERE status = 'rescheduled';

-- 4. Delete cancelled lessons
DELETE FROM public.scheduled_lessons WHERE status = 'cancelled';

-- 5. Migrate trial lessons: cancelled -> absent (trial_lessons_log)
UPDATE public.trial_lessons_log SET status = 'absent' WHERE status = 'cancelled';

-- 6. Recreate mark_lesson_taken with wallet clamping + debt tracking
CREATE OR REPLACE FUNCTION public.mark_lesson_taken(p_student_id uuid, p_class_id uuid, p_teacher_id uuid, p_status text, p_notes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Completed: deduct from wallet, if wallet is 0 increment debt
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
    
    -- Status thresholds using wallet and debt
    -- Active: wallet >= 3, Grace: wallet 0-2 and debt <= 1, Blocked: debt >= 2
    IF v_new_wallet >= 3 THEN
      v_new_status := 'Active';
    ELSIF v_new_debt >= 2 THEN
      v_new_status := 'Blocked';
    ELSE
      v_new_status := 'Grace';
    END IF;
    
    UPDATE students SET status = v_new_status WHERE student_id = p_student_id;
    
    -- Notifications
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
        'URGENT: Student ' || v_student_name || ' has been BLOCKED (' || v_new_debt || ' overdue lessons). No lessons can be marked until payment received.',
        v_student_name, 0);
    END IF;
  ELSIF p_status = 'Absent' THEN
    -- Absent: NO wallet deduction, NO salary impact
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
$function$;

-- 7. Update add_package_with_debt to clear debt when adding credits
CREATE OR REPLACE FUNCTION public.add_package_with_debt(p_student_id uuid, p_amount numeric, p_lessons_purchased integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_wallet INTEGER;
  v_old_debt INTEGER;
  v_debt_covered INTEGER := 0;
  v_new_wallet INTEGER;
  v_new_debt INTEGER;
  v_package_id UUID;
  v_new_status public.student_status;
BEGIN
  SELECT wallet_balance, debt_lessons INTO v_old_wallet, v_old_debt FROM students WHERE student_id = p_student_id;
  
  -- First cover any debt, then add remaining to wallet
  IF v_old_debt > 0 THEN
    v_debt_covered := LEAST(v_old_debt, p_lessons_purchased);
    v_new_debt := v_old_debt - v_debt_covered;
    v_new_wallet := v_old_wallet + (p_lessons_purchased - v_debt_covered);
  ELSE
    v_new_debt := 0;
    v_new_wallet := v_old_wallet + p_lessons_purchased;
  END IF;
  
  INSERT INTO packages (student_id, amount, lessons_purchased, lessons_used)
  VALUES (p_student_id, p_amount, p_lessons_purchased, v_debt_covered)
  RETURNING package_id INTO v_package_id;
  
  -- Determine status
  IF v_new_wallet >= 3 THEN
    v_new_status := 'Active';
  ELSIF v_new_debt >= 2 THEN
    v_new_status := 'Blocked';
  ELSE
    v_new_status := 'Grace';
  END IF;
  
  UPDATE students 
  SET wallet_balance = v_new_wallet,
      debt_lessons = v_new_debt,
      current_package_id = v_package_id,
      status = v_new_status
  WHERE student_id = p_student_id;
  
  RETURN json_build_object(
    'success', true,
    'package_id', v_package_id,
    'old_wallet', v_old_wallet,
    'old_debt', v_old_debt,
    'new_wallet', v_new_wallet,
    'new_debt', v_new_debt,
    'debt_covered', v_debt_covered
  );
END;
$function$;

-- 8. Update check_package_progress to use only valid statuses
CREATE OR REPLACE FUNCTION public.check_package_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_student_id UUID;
  v_student_name TEXT;
  v_lessons_remaining INTEGER;
  v_existing_notification UUID;
BEGIN
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.package_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_lessons, v_completed_lessons
  FROM scheduled_lessons
  WHERE package_id = NEW.package_id;
  
  v_lessons_remaining := v_total_lessons - v_completed_lessons;
  v_student_id := NEW.student_id;
  
  IF v_student_id IS NULL THEN RETURN NEW; END IF;
  
  SELECT name INTO v_student_name FROM students WHERE student_id = v_student_id;
  
  IF v_lessons_remaining <= CEIL(v_total_lessons * 0.2) AND v_lessons_remaining > 0 THEN
    SELECT notification_id INTO v_existing_notification
    FROM notifications WHERE related_id = v_student_id AND type = 'renewal_due' AND is_read = false LIMIT 1;
    
    IF v_existing_notification IS NULL THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES ('renewal_due', v_student_id, 
        'Package for ' || v_student_name || ' is nearly complete. Only ' || v_lessons_remaining || ' scheduled lessons remaining.',
        v_student_name, v_lessons_remaining);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
