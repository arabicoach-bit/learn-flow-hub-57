
-- Fix recalculate_student_wallet: wallet = sum of remaining lessons across ALL active packages
-- remaining per package = lessons_purchased - count(completed + absent)
-- This aligns with the trigger logic and the user's business rules

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
  v_remaining INTEGER;
BEGIN
  -- Calculate wallet as sum of remaining lessons across all ACTIVE packages
  FOR v_pkg IN
    SELECT package_id, lessons_purchased
    FROM packages
    WHERE student_id = p_student_id AND status = 'Active'
  LOOP
    -- Count used lessons (completed + absent) for this package
    SELECT COUNT(*) INTO v_used
    FROM scheduled_lessons
    WHERE package_id = v_pkg.package_id
      AND status IN ('completed', 'absent');

    v_remaining := GREATEST(0, v_pkg.lessons_purchased - v_used);
    v_wallet := v_wallet + v_remaining;
  END LOOP;

  -- Update wallet balance
  UPDATE students
  SET wallet_balance = v_wallet
  WHERE student_id = p_student_id;

  -- Also sync wallet_deducted flags for consistency
  -- Mark all completed lessons as deducted
  UPDATE scheduled_lessons
  SET wallet_deducted = true,
      wallet_deducted_at = COALESCE(wallet_deducted_at, now())
  WHERE student_id = p_student_id
    AND status = 'completed'
    AND wallet_deducted = false;

  -- Mark all non-completed lessons as not deducted
  UPDATE scheduled_lessons
  SET wallet_deducted = false,
      wallet_deducted_at = NULL
  WHERE student_id = p_student_id
    AND status != 'completed'
    AND wallet_deducted = true;

  RETURN json_build_object(
    'success', true,
    'wallet', v_wallet,
    'student_id', p_student_id
  );
END;
$function$;

-- Also fix the trigger to use the same wallet calculation instead of +1/-1
-- This prevents drift between trigger and recalculate
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
BEGIN
  -- Only act when status actually changes
  IF OLD.status = NEW.status THEN
    -- Just sync the deducted flag
    IF NEW.status = 'completed' THEN
      NEW.wallet_deducted := true;
      NEW.wallet_deducted_at := COALESCE(NEW.wallet_deducted_at, now());
    ELSE
      NEW.wallet_deducted := false;
      NEW.wallet_deducted_at := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- Set deducted flags based on new status
  IF NEW.status = 'completed' THEN
    NEW.wallet_deducted := true;
    NEW.wallet_deducted_at := now();
  ELSE
    NEW.wallet_deducted := false;
    NEW.wallet_deducted_at := NULL;
  END IF;

  -- Full recalculation of wallet from active packages
  -- This ensures wallet is always accurate regardless of race conditions
  FOR v_pkg IN
    SELECT package_id, lessons_purchased
    FROM packages
    WHERE student_id = NEW.student_id AND status = 'Active'
  LOOP
    SELECT COUNT(*) INTO v_used
    FROM scheduled_lessons
    WHERE package_id = v_pkg.package_id
      AND status IN ('completed', 'absent')
      AND scheduled_lesson_id != NEW.scheduled_lesson_id; -- exclude current row (use NEW status)

    -- Include current lesson if it's completed or absent in the NEW state
    IF NEW.package_id = v_pkg.package_id AND NEW.status IN ('completed', 'absent') THEN
      v_used := v_used + 1;
    END IF;

    v_wallet := v_wallet + GREATEST(0, v_pkg.lessons_purchased - v_used);
  END LOOP;

  UPDATE public.students
  SET wallet_balance = v_wallet
  WHERE student_id = NEW.student_id;

  RETURN NEW;
END;
$function$;
