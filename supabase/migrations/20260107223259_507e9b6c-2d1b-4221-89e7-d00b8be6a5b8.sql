-- Create function to generate comprehensive package summary
CREATE OR REPLACE FUNCTION public.generate_package_summary(p_package_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_summary JSON;
BEGIN
  SELECT json_build_object(
    'package_id', p.package_id,
    'student_name', s.name,
    'student_phone', s.phone,
    'parent_phone', s.parent_phone,
    'amount', p.amount,
    'lessons_purchased', p.lessons_purchased,
    'lessons_used', p.lessons_used,
    'payment_date', p.payment_date,
    'completed_date', p.completed_date,
    'status', p.status,
    'lessons', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'date', l.lesson_date,
          'class_name', COALESCE(c.name, 'N/A'),
          'teacher_name', COALESCE(t.name, 'N/A'),
          'status', l.status,
          'notes', l.notes
        ) ORDER BY l.lesson_date
      ), '[]'::json)
      FROM lessons_log l
      LEFT JOIN classes c ON l.class_id = c.class_id
      LEFT JOIN teachers t ON l.teacher_id = t.teacher_id
      WHERE l.package_id_used = p.package_id
    ),
    'statistics', json_build_object(
      'total_taken', (SELECT COUNT(*) FROM lessons_log WHERE package_id_used = p.package_id AND status = 'Taken'),
      'total_absent', (SELECT COUNT(*) FROM lessons_log WHERE package_id_used = p.package_id AND status = 'Absent'),
      'total_cancelled', (SELECT COUNT(*) FROM lessons_log WHERE package_id_used = p.package_id AND status = 'Cancelled')
    )
  ) INTO v_summary
  FROM packages p
  JOIN students s ON p.student_id = s.student_id
  WHERE p.package_id = p_package_id;

  RETURN v_summary;
END;
$function$;