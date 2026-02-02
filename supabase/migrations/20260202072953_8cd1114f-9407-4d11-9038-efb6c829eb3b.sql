-- Fix the security definer view by using SECURITY INVOKER
DROP VIEW IF EXISTS public.teacher_monthly_stats;

CREATE VIEW public.teacher_monthly_stats 
WITH (security_invoker = on)
AS
SELECT 
  t.teacher_id,
  t.name AS teacher_name,
  t.rate_per_lesson AS rate_per_lesson,
  date_trunc('month', l.lesson_date)::date AS month,
  COUNT(l.lesson_id) AS lessons_taught,
  COALESCE(SUM(
    CASE 
      WHEN sl.duration_minutes IS NOT NULL THEN sl.duration_minutes / 60.0
      ELSE 0.75
    END
  ), 0) AS total_hours,
  COALESCE(SUM(
    CASE 
      WHEN sl.duration_minutes IS NOT NULL THEN (sl.duration_minutes / 60.0) * t.rate_per_lesson
      ELSE 0.75 * t.rate_per_lesson
    END
  ), 0) AS salary_earned
FROM teachers t
LEFT JOIN lessons_log l ON t.teacher_id = l.teacher_id AND l.status = 'Taken'
LEFT JOIN scheduled_lessons sl ON l.lesson_id = sl.lesson_log_id
WHERE t.is_active = true
GROUP BY t.teacher_id, t.name, t.rate_per_lesson, date_trunc('month', l.lesson_date);

-- Grant access to authenticated users
GRANT SELECT ON public.teacher_monthly_stats TO authenticated;