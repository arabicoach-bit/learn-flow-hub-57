
-- Update add_package_with_debt to use new student_status values
CREATE OR REPLACE FUNCTION public.add_package_with_debt(
  p_student_id uuid,
  p_amount numeric,
  p_lessons_purchased integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_wallet INTEGER;
  v_old_debt INTEGER;
  v_debt_covered INTEGER := 0;
  v_new_wallet INTEGER;
  v_new_debt INTEGER;
  v_package_id UUID;
  v_new_status public.student_status;
BEGIN
  SELECT wallet_balance, debt_lessons
  INTO v_old_wallet, v_old_debt
  FROM students
  WHERE student_id = p_student_id;

  IF v_old_debt > 0 THEN
    v_debt_covered := LEAST(v_old_debt, p_lessons_purchased);
    v_new_debt := v_old_debt - v_debt_covered;
    v_new_wallet := (v_old_wallet) + (p_lessons_purchased - v_debt_covered);
  ELSE
    v_new_debt := 0;
    v_new_wallet := (v_old_wallet) + p_lessons_purchased;
  END IF;

  INSERT INTO packages (student_id, amount, lessons_purchased, lessons_used)
  VALUES (p_student_id, p_amount, p_lessons_purchased, v_debt_covered)
  RETURNING package_id INTO v_package_id;

  IF v_new_wallet >= 3 THEN
    v_new_status := 'Active';
  ELSIF v_new_debt >= 2 THEN
    v_new_status := 'Left';
  ELSE
    v_new_status := 'Temporary Stop';
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
$$;
