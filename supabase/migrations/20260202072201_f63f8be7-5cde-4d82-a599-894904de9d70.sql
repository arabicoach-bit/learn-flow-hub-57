-- Add RLS policy for teachers to update their own students
CREATE POLICY "Teachers can update own students" 
ON public.students 
FOR UPDATE 
USING (teacher_id = get_user_teacher_id(auth.uid()))
WITH CHECK (teacher_id = get_user_teacher_id(auth.uid()));

-- Recreate the teacher_monthly_stats view to calculate salary based on hours, not lessons
-- Rate is now treated as hourly rate (e.g., 250 AED/hour)
DROP VIEW IF EXISTS public.teacher_monthly_stats;

CREATE VIEW public.teacher_monthly_stats AS
SELECT 
  t.teacher_id,
  t.name AS teacher_name,
  t.rate_per_lesson AS rate_per_lesson, -- This is actually rate per hour now
  date_trunc('month', l.lesson_date)::date AS month,
  COUNT(l.lesson_id) AS lessons_taught,
  COALESCE(SUM(
    CASE 
      WHEN sl.duration_minutes IS NOT NULL THEN sl.duration_minutes / 60.0
      ELSE 0.75 -- Default 45 min if no duration found
    END
  ), 0) AS total_hours,
  COALESCE(SUM(
    CASE 
      WHEN sl.duration_minutes IS NOT NULL THEN (sl.duration_minutes / 60.0) * t.rate_per_lesson
      ELSE 0.75 * t.rate_per_lesson -- Default 45 min
    END
  ), 0) AS salary_earned
FROM teachers t
LEFT JOIN lessons_log l ON t.teacher_id = l.teacher_id AND l.status = 'Taken'
LEFT JOIN scheduled_lessons sl ON l.lesson_id = sl.lesson_log_id
WHERE t.is_active = true
GROUP BY t.teacher_id, t.name, t.rate_per_lesson, date_trunc('month', l.lesson_date);