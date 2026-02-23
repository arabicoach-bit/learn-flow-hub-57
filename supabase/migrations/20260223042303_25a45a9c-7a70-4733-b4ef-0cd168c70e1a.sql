
CREATE OR REPLACE VIEW public.teacher_monthly_performance AS
WITH monthly_lessons AS (
  SELECT 
    teacher_id,
    DATE_TRUNC('month', scheduled_date::timestamp)::date AS month,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE status = 'absent') AS absent_count,
    COALESCE(SUM(duration_minutes) FILTER (WHERE status = 'completed'), 0) / 60.0 AS total_hours
  FROM scheduled_lessons
  GROUP BY teacher_id, DATE_TRUNC('month', scheduled_date::timestamp)::date
),
monthly_trials AS (
  SELECT 
    teacher_id,
    DATE_TRUNC('month', lesson_date::timestamp)::date AS month,
    COUNT(*) FILTER (WHERE status = 'completed') AS trial_completed_count
  FROM trial_lessons_log
  GROUP BY teacher_id, DATE_TRUNC('month', lesson_date::timestamp)::date
)
SELECT 
  t.teacher_id,
  t.name AS teacher_name,
  t.rate_per_lesson,
  ml.month,
  COALESCE(ml.completed_count, 0) AS completed_count,
  COALESCE(ml.absent_count, 0) AS absent_count,
  COALESCE(ml.total_hours, 0) AS total_hours,
  COALESCE(ml.total_hours, 0) * COALESCE(t.rate_per_lesson, 0) AS salary,
  (SELECT COUNT(*) FROM students s WHERE s.teacher_id = t.teacher_id AND s.status = 'Active') AS active_students,
  COALESCE(mt.trial_completed_count, 0) AS trial_completed_count
FROM teachers t
LEFT JOIN monthly_lessons ml ON ml.teacher_id = t.teacher_id
LEFT JOIN monthly_trials mt ON mt.teacher_id = t.teacher_id AND mt.month = ml.month
WHERE t.is_active = true AND ml.month IS NOT NULL;
