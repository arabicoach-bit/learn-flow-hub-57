
-- Update recalculate_student_wallet to also sync lessons_purchased = total lesson rows
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
  v_scheduled_count INTEGER;
  v_total_rows INTEGER;
BEGIN
  FOR v_pkg IN
    SELECT package_id, lessons_purchased
    FROM packages
    WHERE student_id = p_student_id AND packages.status IN ('Active', 'Completed')
  LOOP
    -- Count used (completed + absent)
    SELECT COUNT(*) INTO v_used
    FROM scheduled_lessons
    WHERE package_id = v_pkg.package_id
      AND scheduled_lessons.status IN ('completed', 'absent');

    -- Count scheduled
    SELECT COUNT(*) INTO v_scheduled_count
    FROM scheduled_lessons
    WHERE package_id = v_pkg.package_id
      AND scheduled_lessons.status = 'scheduled';

    -- Count ALL lesson rows = single source of truth for lessons_purchased
    v_total_rows := v_used + v_scheduled_count;

    -- Sync lessons_purchased and lessons_used from actual data
    UPDATE packages
    SET lessons_purchased = v_total_rows,
        lessons_used = v_used
    WHERE package_id = v_pkg.package_id;

    v_wallet := v_wallet + v_scheduled_count;

    -- Package status: In Progress if scheduled > 0, Finished if 0
    IF v_scheduled_count = 0 THEN
      UPDATE packages SET status = 'Completed', completed_date = COALESCE(completed_date, CURRENT_DATE)
      WHERE package_id = v_pkg.package_id AND packages.status = 'Active';
    ELSE
      UPDATE packages SET status = 'Active', completed_date = NULL
      WHERE package_id = v_pkg.package_id AND packages.status = 'Completed';
    END IF;
  END LOOP;

  UPDATE students SET wallet_balance = v_wallet WHERE student_id = p_student_id;

  UPDATE scheduled_lessons
  SET wallet_deducted = true, wallet_deducted_at = COALESCE(wallet_deducted_at, now())
  WHERE student_id = p_student_id AND status = 'completed' AND wallet_deducted = false;

  UPDATE scheduled_lessons
  SET wallet_deducted = false, wallet_deducted_at = NULL
  WHERE student_id = p_student_id AND status != 'completed' AND wallet_deducted = true;

  RETURN json_build_object('success', true, 'wallet', v_wallet, 'student_id', p_student_id);
END;
$function$;

-- Update trigger_wallet_sync_on_status_change to also sync lessons_purchased
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
  v_scheduled_count INTEGER;
  v_total_rows INTEGER;
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
    WHERE student_id = NEW.student_id AND packages.status IN ('Active', 'Completed')
  LOOP
    SELECT COUNT(*) INTO v_used
    FROM scheduled_lessons
    WHERE package_id = v_pkg.package_id
      AND scheduled_lessons.status IN ('completed', 'absent')
      AND scheduled_lesson_id != NEW.scheduled_lesson_id;

    IF NEW.package_id = v_pkg.package_id AND NEW.status IN ('completed', 'absent') THEN
      v_used := v_used + 1;
    END IF;

    SELECT COUNT(*) INTO v_scheduled_count
    FROM scheduled_lessons
    WHERE package_id = v_pkg.package_id
      AND scheduled_lessons.status = 'scheduled'
      AND scheduled_lesson_id != NEW.scheduled_lesson_id;

    IF NEW.package_id = v_pkg.package_id AND NEW.status = 'scheduled' THEN
      v_scheduled_count := v_scheduled_count + 1;
    END IF;

    -- Sync lessons_purchased = total actual rows
    v_total_rows := v_used + v_scheduled_count;
    UPDATE packages
    SET lessons_purchased = v_total_rows,
        lessons_used = v_used
    WHERE package_id = v_pkg.package_id;

    v_wallet := v_wallet + v_scheduled_count;

    IF v_scheduled_count = 0 THEN
      UPDATE packages SET status = 'Completed', completed_date = COALESCE(completed_date, CURRENT_DATE)
      WHERE package_id = v_pkg.package_id AND packages.status = 'Active';
    ELSE
      UPDATE packages SET status = 'Active', completed_date = NULL
      WHERE package_id = v_pkg.package_id AND packages.status = 'Completed';
    END IF;
  END LOOP;

  UPDATE public.students SET wallet_balance = v_wallet WHERE student_id = NEW.student_id;
  RETURN NEW;
END;
$function$;
