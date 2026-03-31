
-- Create transfer_student function: atomic transfer of student to new teacher
CREATE OR REPLACE FUNCTION public.transfer_student(
  p_student_id UUID,
  p_new_teacher_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_teacher_id UUID;
  v_old_teacher_name TEXT;
  v_new_teacher_name TEXT;
  v_student_name TEXT;
  v_lessons_moved INTEGER;
BEGIN
  -- Get current student info
  SELECT teacher_id, name INTO v_old_teacher_id, v_student_name
  FROM students WHERE student_id = p_student_id;

  IF v_old_teacher_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Student has no current teacher');
  END IF;

  IF v_old_teacher_id = p_new_teacher_id THEN
    RETURN json_build_object('success', false, 'error', 'Student is already assigned to this teacher');
  END IF;

  -- Get teacher names
  SELECT name INTO v_old_teacher_name FROM teachers WHERE teacher_id = v_old_teacher_id;
  SELECT name INTO v_new_teacher_name FROM teachers WHERE teacher_id = p_new_teacher_id;

  -- 1. Reassign future scheduled lessons to new teacher
  UPDATE scheduled_lessons
  SET teacher_id = p_new_teacher_id
  WHERE student_id = p_student_id
    AND status = 'scheduled'
    AND teacher_id = v_old_teacher_id;

  GET DIAGNOSTICS v_lessons_moved = ROW_COUNT;

  -- 2. Update student's primary teacher
  UPDATE students
  SET teacher_id = p_new_teacher_id,
      updated_at = now()
  WHERE student_id = p_student_id;

  -- 3. Log the transfer in audit_logs
  INSERT INTO audit_logs (action, performed_by, details)
  VALUES (
    'student_transfer',
    auth.uid(),
    json_build_object(
      'student_id', p_student_id,
      'student_name', v_student_name,
      'from_teacher_id', v_old_teacher_id,
      'from_teacher_name', v_old_teacher_name,
      'to_teacher_id', p_new_teacher_id,
      'to_teacher_name', v_new_teacher_name,
      'lessons_moved', v_lessons_moved,
      'notes', p_notes,
      'transferred_at', now()
    )::jsonb
  );

  RETURN json_build_object(
    'success', true,
    'student_name', v_student_name,
    'from_teacher', v_old_teacher_name,
    'to_teacher', v_new_teacher_name,
    'lessons_moved', v_lessons_moved
  );
END;
$$;
