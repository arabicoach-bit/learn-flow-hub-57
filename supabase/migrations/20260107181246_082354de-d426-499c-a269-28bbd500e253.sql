-- Fix search_path on existing functions

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_lesson_taken(p_student_id uuid, p_class_id uuid, p_teacher_id uuid, p_status text, p_notes text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet INTEGER;
  v_current_package UUID;
  v_max_debt INTEGER;
  v_new_wallet INTEGER;
  v_new_status public.student_status;
  v_package_to_use UUID;
BEGIN
  SELECT wallet_balance, current_package_id INTO v_wallet, v_current_package
  FROM students WHERE student_id = p_student_id;
  
  SELECT config_value::INTEGER INTO v_max_debt
  FROM system_config WHERE config_key = 'max_debt_lessons';
  
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
    
    IF v_new_wallet > 0 THEN
      v_new_status := 'Active';
    ELSIF v_new_wallet <= v_max_debt THEN
      v_new_status := 'Blocked';
    ELSE
      v_new_status := 'Grace';
    END IF;
    
    UPDATE students SET status = v_new_status WHERE student_id = p_student_id;
    
    IF v_new_wallet = 2 THEN
      INSERT INTO notifications (type, related_id, message)
      VALUES ('low_balance', p_student_id, 'Student needs renewal soon');
    ELSIF v_new_wallet = 0 THEN
      INSERT INTO notifications (type, related_id, message)
      VALUES ('grace_mode', p_student_id, 'Student entered grace period');
    ELSIF v_new_wallet <= v_max_debt THEN
      INSERT INTO notifications (type, related_id, message)
      VALUES ('blocked', p_student_id, 'Student BLOCKED - exceeded debt limit');
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
    'new_status', v_new_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.add_package_with_debt(p_student_id uuid, p_amount numeric, p_lessons_purchased integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_wallet INTEGER;
  v_debt_covered INTEGER := 0;
  v_new_wallet INTEGER;
  v_package_id UUID;
  v_new_status public.student_status;
BEGIN
  SELECT wallet_balance INTO v_old_wallet FROM students WHERE student_id = p_student_id;
  
  IF v_old_wallet < 0 THEN
    v_debt_covered := LEAST(ABS(v_old_wallet), p_lessons_purchased);
  END IF;
  
  v_new_wallet := v_old_wallet + p_lessons_purchased;
  
  INSERT INTO packages (student_id, amount, lessons_purchased, lessons_used)
  VALUES (p_student_id, p_amount, p_lessons_purchased, v_debt_covered)
  RETURNING package_id INTO v_package_id;
  
  IF v_new_wallet > 0 THEN
    v_new_status := 'Active';
  ELSE
    v_new_status := 'Grace';
  END IF;
  
  UPDATE students 
  SET wallet_balance = v_new_wallet,
      current_package_id = v_package_id,
      status = v_new_status
  WHERE student_id = p_student_id;
  
  RETURN json_build_object(
    'success', true,
    'package_id', v_package_id,
    'old_wallet', v_old_wallet,
    'new_wallet', v_new_wallet,
    'debt_covered', v_debt_covered
  );
END;
$$;

-- Create trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();