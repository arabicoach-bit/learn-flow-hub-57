
-- Drop and recreate mark_lesson_taken WITHOUT p_class_id
DROP FUNCTION IF EXISTS public.mark_lesson_taken(uuid, uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.mark_lesson_taken(p_student_id uuid, p_teacher_id uuid, p_status text, p_notes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_package UUID;
  v_student_name TEXT;
  v_wallet INTEGER;
  v_debt INTEGER;
  v_new_status TEXT;
  v_teacher_name TEXT;
  v_lessons_purchased INTEGER;
  v_existing_notif UUID;
  v_remaining_scheduled INTEGER;
  v_pkg_lessons_used INTEGER;
  v_pkg_lessons_purchased INTEGER;
BEGIN
  SELECT current_package_id, name
  INTO v_current_package, v_student_name
  FROM students WHERE student_id = p_student_id;

  SELECT name INTO v_teacher_name
  FROM teachers WHERE teacher_id = p_teacher_id;

  IF v_current_package IS NOT NULL THEN
    SELECT lessons_purchased INTO v_lessons_purchased
    FROM packages WHERE package_id = v_current_package;
  END IF;

  IF p_status = 'completed' AND v_current_package IS NOT NULL THEN
    UPDATE packages SET lessons_used = lessons_used + 1 WHERE package_id = v_current_package;
  END IF;

  PERFORM recalculate_student_wallet(p_student_id);

  SELECT wallet_balance, debt_lessons, status::text
  INTO v_wallet, v_debt, v_new_status
  FROM students WHERE student_id = p_student_id;

  IF p_status = 'completed' THEN
    INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
    VALUES (
      'lesson_completed',
      p_student_id,
      '✅ Lesson completed for ' || v_student_name ||
      ' | 👨‍🏫 Teacher: ' || COALESCE(v_teacher_name, 'N/A') ||
      ' | 📝 Notes: ' || COALESCE(p_notes, '-') ||
      ' | 📚 Remaining: ' || v_wallet ||
      ' out of ' || COALESCE(v_lessons_purchased::text, '?') ||
      ' lessons' ||
      CASE
        WHEN v_wallet = 0 THEN ' | 🚨 Urgent renewal'
        WHEN v_wallet <= 2 THEN ' | ⚠️ Low credit'
        ELSE ''
      END,
      v_student_name,
      v_wallet
    );
  END IF;

  IF p_status IN ('completed', 'absent') THEN
    IF v_wallet = 2 AND v_debt = 0 THEN
      SELECT notification_id INTO v_existing_notif
      FROM notifications
      WHERE type = 'low_balance' AND related_id = p_student_id AND is_read = false AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1;
      IF v_existing_notif IS NULL THEN
        INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
        VALUES ('low_balance', p_student_id, 'Student ' || v_student_name || ' has only 2 lessons remaining.', v_student_name, 2);
      END IF;
    ELSIF v_wallet = 0 AND v_debt = 0 THEN
      SELECT notification_id INTO v_existing_notif
      FROM notifications
      WHERE type = 'grace_mode' AND related_id = p_student_id AND is_read = false AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1;
      IF v_existing_notif IS NULL THEN
        INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
        VALUES ('grace_mode', p_student_id, 'Student ' || v_student_name || ' has 0 lessons remaining.', v_student_name, 0);
      END IF;
    ELSIF v_debt >= 2 THEN
      SELECT notification_id INTO v_existing_notif
      FROM notifications
      WHERE type = 'blocked' AND related_id = p_student_id AND is_read = false AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1;
      IF v_existing_notif IS NULL THEN
        INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
        VALUES ('blocked', p_student_id, 'URGENT: ' || v_student_name || ' has LEFT (' || v_debt || ' overdue lessons).', v_student_name, 0);
      END IF;
    END IF;
  END IF;

  IF v_current_package IS NOT NULL THEN
    SELECT lessons_used, lessons_purchased
    INTO v_pkg_lessons_used, v_pkg_lessons_purchased
    FROM packages 
    WHERE package_id = v_current_package;

    SELECT COUNT(*) INTO v_remaining_scheduled
    FROM scheduled_lessons
    WHERE package_id = v_current_package
    AND status = 'scheduled';

    IF v_pkg_lessons_used >= v_pkg_lessons_purchased 
       OR v_remaining_scheduled = 0 THEN
      UPDATE packages
      SET 
        status = 'Completed',
        completed_date = COALESCE(completed_date, CURRENT_DATE)
      WHERE package_id = v_current_package
      AND status = 'Active';
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'new_wallet', v_wallet, 'new_debt', v_debt, 'new_status', v_new_status, 'student_name', v_student_name);
END;
$function$;

-- Update generate_package_schedule to make p_class_id optional with default NULL
DROP FUNCTION IF EXISTS public.generate_package_schedule(uuid, uuid, uuid, uuid, date, integer, integer, jsonb);

CREATE OR REPLACE FUNCTION public.generate_package_schedule(p_package_id uuid, p_student_id uuid, p_teacher_id uuid, p_start_date date, p_total_lessons integer, p_lesson_duration integer, p_schedule_days jsonb, p_class_id uuid DEFAULT NULL)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_schedule_entry JSONB;
  v_current_date DATE;
  v_lessons_scheduled INTEGER := 0;
  v_new_lessons INTEGER := 0;
  v_scheduled_dates DATE[] := ARRAY[]::DATE[];
  v_day_of_week INTEGER;
  v_time_slot TIME;
  v_week_start DATE;
  v_max_iterations INTEGER := 365;
  v_iteration INTEGER := 0;
  v_existing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_existing_count
  FROM scheduled_lessons 
  WHERE package_id = p_package_id 
    AND status IN ('scheduled', 'completed');
  
  v_lessons_scheduled := v_existing_count;
  v_current_date := p_start_date;
  v_week_start := p_start_date;
  
  WHILE v_lessons_scheduled < p_total_lessons AND v_iteration < v_max_iterations LOOP
    v_iteration := v_iteration + 1;
    
    FOR v_schedule_entry IN SELECT * FROM jsonb_array_elements(p_schedule_days)
    LOOP
      v_day_of_week := (v_schedule_entry->>'day')::INTEGER;
      v_time_slot := (v_schedule_entry->>'time')::TIME;
      
      v_current_date := v_week_start + ((v_day_of_week - EXTRACT(DOW FROM v_week_start)::INTEGER + 7) % 7);
      
      IF v_current_date < p_start_date THEN
        CONTINUE;
      END IF;
      
      IF v_lessons_scheduled < p_total_lessons THEN
        IF NOT EXISTS (
          SELECT 1 FROM scheduled_lessons
          WHERE student_id = p_student_id
            AND scheduled_date = v_current_date
            AND scheduled_time = v_time_slot
        ) THEN
          INSERT INTO scheduled_lessons (
            package_id, student_id, teacher_id, class_id,
            scheduled_date, scheduled_time, duration_minutes, status
          ) VALUES (
            p_package_id, p_student_id, p_teacher_id, p_class_id,
            v_current_date, v_time_slot, p_lesson_duration, 'scheduled'
          );
          
          v_lessons_scheduled := v_lessons_scheduled + 1;
          v_new_lessons := v_new_lessons + 1;
          v_scheduled_dates := array_append(v_scheduled_dates, v_current_date);
        END IF;
      END IF;
    END LOOP;
    
    v_week_start := v_week_start + INTERVAL '7 days';
  END LOOP;
  
  UPDATE packages SET schedule_generated = true WHERE package_id = p_package_id;
  
  RETURN json_build_object(
    'success', true,
    'lessons_scheduled', v_lessons_scheduled,
    'new_lessons_added', v_new_lessons,
    'scheduled_dates', v_scheduled_dates,
    'start_date', p_start_date
  );
END;
$function$;

-- Also update the lesson_status enum to remove 'Taken' and 'Cancelled', replace with 'completed' and 'absent'
-- First check if enum values exist before altering
DO $$
BEGIN
  -- We can't easily remove enum values in PostgreSQL, but since this enum 
  -- isn't actively used by any table constraint anymore (scheduled_lessons uses text),
  -- we'll drop and recreate it
  DROP TYPE IF EXISTS public.lesson_status CASCADE;
  CREATE TYPE public.lesson_status AS ENUM ('completed', 'absent', 'scheduled');
END $$;
