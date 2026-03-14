
-- 1. Update trigger to also sync lessons_used on packages
CREATE OR REPLACE FUNCTION public.trigger_wallet_sync_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet INTEGER := 0;
  v_pkg RECORD;
  v_used INTEGER;
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
    WHERE student_id = NEW.student_id AND status = 'Active'
  LOOP
    SELECT COUNT(*) INTO v_used
    FROM scheduled_lessons
    WHERE package_id = v_pkg.package_id
      AND status IN ('completed', 'absent')
      AND scheduled_lesson_id != NEW.scheduled_lesson_id;

    IF NEW.package_id = v_pkg.package_id AND NEW.status IN ('completed', 'absent') THEN
      v_used := v_used + 1;
    END IF;

    -- Sync lessons_used on the package
    UPDATE packages SET lessons_used = v_used WHERE package_id = v_pkg.package_id;

    v_wallet := v_wallet + GREATEST(0, v_pkg.lessons_purchased - v_used);
  END LOOP;

  UPDATE public.students
  SET wallet_balance = v_wallet
  WHERE student_id = NEW.student_id;

  RETURN NEW;
END;
$$;

-- 2. Update recalculate_student_wallet to also sync lessons_used
CREATE OR REPLACE FUNCTION public.recalculate_student_wallet(p_student_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wallet INTEGER := 0;
  v_pkg RECORD;
  v_used INTEGER;
  v_remaining INTEGER;
BEGIN
  FOR v_pkg IN
    SELECT package_id, lessons_purchased
    FROM packages
    WHERE student_id = p_student_id AND status = 'Active'
  LOOP
    SELECT COUNT(*) INTO v_used
    FROM scheduled_lessons
    WHERE package_id = v_pkg.package_id
      AND status IN ('completed', 'absent');

    -- Sync lessons_used on the package
    UPDATE packages SET lessons_used = v_used WHERE package_id = v_pkg.package_id;

    v_remaining := GREATEST(0, v_pkg.lessons_purchased - v_used);
    v_wallet := v_wallet + v_remaining;
  END LOOP;

  UPDATE students
  SET wallet_balance = v_wallet
  WHERE student_id = p_student_id;

  UPDATE scheduled_lessons
  SET wallet_deducted = true,
      wallet_deducted_at = COALESCE(wallet_deducted_at, now())
  WHERE student_id = p_student_id
    AND status = 'completed'
    AND wallet_deducted = false;

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
$$;

-- 3. Bulk sync all active packages lessons_used
UPDATE packages p
SET lessons_used = (
  SELECT COUNT(*)
  FROM scheduled_lessons sl
  WHERE sl.package_id = p.package_id
    AND sl.status IN ('completed', 'absent')
)
WHERE p.status = 'Active';

-- 4. Recalculate all active student wallets
DO $$
DECLARE
  v_student RECORD;
BEGIN
  FOR v_student IN
    SELECT DISTINCT student_id FROM students WHERE status = 'Active'
  LOOP
    PERFORM recalculate_student_wallet(v_student.student_id);
  END LOOP;
END;
$$;
