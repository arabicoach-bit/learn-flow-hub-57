
-- Fix wallet to count ONLY scheduled lessons (not completed/absent)
CREATE OR REPLACE FUNCTION public.recalculate_student_wallet(p_student_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scheduled_count INTEGER;
  v_completed_count INTEGER;
  v_absent_count INTEGER;
  v_new_status public.student_status;
BEGIN
  -- Wallet = number of scheduled (upcoming) lessons only
  SELECT COUNT(*)
  INTO v_scheduled_count
  FROM scheduled_lessons
  WHERE student_id = p_student_id AND status = 'scheduled';

  -- Count used lessons for status threshold logic
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'absent')
  INTO v_completed_count, v_absent_count
  FROM scheduled_lessons
  WHERE student_id = p_student_id;

  -- Status logic: Active if has scheduled lessons, otherwise check debt pattern
  IF v_scheduled_count >= 1 THEN 
    v_new_status := 'Active';
  ELSIF v_absent_count >= 2 THEN 
    v_new_status := 'Left';
  ELSE 
    v_new_status := 'Temporary Stop';
  END IF;

  UPDATE students
  SET wallet_balance = v_scheduled_count, 
      debt_lessons = 0, 
      status = v_new_status
  WHERE student_id = p_student_id;

  RETURN json_build_object(
    'success', true, 
    'wallet', v_scheduled_count,
    'completed', v_completed_count,
    'absent', v_absent_count,
    'status', v_new_status
  );
END;
$$;
