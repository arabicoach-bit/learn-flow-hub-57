
-- Update generate_package_schedule to handle the unique constraint on (student_id, scheduled_date, scheduled_time)
CREATE OR REPLACE FUNCTION public.generate_package_schedule(
  p_package_id UUID,
  p_student_id UUID,
  p_teacher_id UUID,
  p_class_id UUID,
  p_start_date DATE,
  p_total_lessons INTEGER,
  p_lesson_duration INTEGER,
  p_schedule_days JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Count already existing scheduled/completed lessons for this package
  SELECT COUNT(*) INTO v_existing_count
  FROM scheduled_lessons 
  WHERE package_id = p_package_id 
    AND status IN ('scheduled', 'completed');
  
  -- Adjust total lessons to only generate remaining ones
  v_lessons_scheduled := v_existing_count;
  
  v_current_date := p_start_date;
  v_week_start := p_start_date;
  
  -- Loop until we've scheduled all lessons (with safety limit)
  WHILE v_lessons_scheduled < p_total_lessons AND v_iteration < v_max_iterations LOOP
    v_iteration := v_iteration + 1;
    
    -- Check each day in the schedule for current week
    FOR v_schedule_entry IN SELECT * FROM jsonb_array_elements(p_schedule_days)
    LOOP
      v_day_of_week := (v_schedule_entry->>'day')::INTEGER;
      v_time_slot := (v_schedule_entry->>'time')::TIME;
      
      -- Calculate the date for this day of week in current week
      v_current_date := v_week_start + ((v_day_of_week - EXTRACT(DOW FROM v_week_start)::INTEGER + 7) % 7);
      
      -- Skip if date is before start date
      IF v_current_date < p_start_date THEN
        CONTINUE;
      END IF;
      
      -- Check if we haven't exceeded total lessons
      IF v_lessons_scheduled < p_total_lessons THEN
        -- Check if this exact lesson already exists (for this package OR any other for the same student)
        IF NOT EXISTS (
          SELECT 1 FROM scheduled_lessons
          WHERE student_id = p_student_id
            AND scheduled_date = v_current_date
            AND scheduled_time = v_time_slot
        ) THEN
          -- Insert scheduled lesson
          INSERT INTO scheduled_lessons (
            package_id,
            student_id,
            teacher_id,
            class_id,
            scheduled_date,
            scheduled_time,
            duration_minutes,
            status
          ) VALUES (
            p_package_id,
            p_student_id,
            p_teacher_id,
            p_class_id,
            v_current_date,
            v_time_slot,
            p_lesson_duration,
            'scheduled'
          );
          
          v_lessons_scheduled := v_lessons_scheduled + 1;
          v_new_lessons := v_new_lessons + 1;
          v_scheduled_dates := array_append(v_scheduled_dates, v_current_date);
        END IF;
      END IF;
    END LOOP;
    
    -- Move to next week
    v_week_start := v_week_start + INTERVAL '7 days';
  END LOOP;
  
  -- Mark package as schedule generated
  UPDATE packages 
  SET schedule_generated = true 
  WHERE package_id = p_package_id;
  
  -- Return summary
  RETURN json_build_object(
    'success', true,
    'lessons_scheduled', v_lessons_scheduled,
    'new_lessons_added', v_new_lessons,
    'scheduled_dates', v_scheduled_dates,
    'start_date', p_start_date
  );
END;
$$;
