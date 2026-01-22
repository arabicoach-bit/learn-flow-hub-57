-- Fix Security Definer View warnings by recreating views with SECURITY INVOKER

-- Drop and recreate views with SECURITY INVOKER
DROP VIEW IF EXISTS teacher_monthly_stats;
DROP VIEW IF EXISTS teacher_todays_lessons;
DROP VIEW IF EXISTS teacher_tomorrows_lessons;
DROP VIEW IF EXISTS teacher_week_lessons;

-- View: Teacher monthly stats with SECURITY INVOKER
CREATE VIEW teacher_monthly_stats WITH (security_invoker = on) AS
SELECT 
  t.teacher_id,
  t.name as teacher_name,
  t.rate_per_lesson,
  DATE_TRUNC('month', ll.date)::date as month,
  COUNT(ll.lesson_id) as lessons_taught,
  COALESCE(SUM(COALESCE(sl.duration_minutes, 45)), 0) / 60.0 as total_hours,
  COUNT(ll.lesson_id) * t.rate_per_lesson as salary_earned
FROM teachers t
LEFT JOIN lessons_log ll ON t.teacher_id = ll.teacher_id 
  AND ll.status = 'Taken'
LEFT JOIN scheduled_lessons sl ON ll.lesson_id = sl.lesson_log_id
GROUP BY t.teacher_id, t.name, t.rate_per_lesson, DATE_TRUNC('month', ll.date);

-- View: Today's lessons per teacher with SECURITY INVOKER
CREATE VIEW teacher_todays_lessons WITH (security_invoker = on) AS
SELECT 
  sl.scheduled_lesson_id,
  sl.teacher_id,
  t.name as teacher_name,
  sl.student_id,
  s.name as student_name,
  s.wallet_balance,
  s.status as student_status,
  sl.scheduled_time,
  sl.duration_minutes,
  sl.status,
  p.name as program_name,
  s.student_level
FROM scheduled_lessons sl
JOIN teachers t ON sl.teacher_id = t.teacher_id
JOIN students s ON sl.student_id = s.student_id
LEFT JOIN programs p ON s.program_id = p.program_id
WHERE sl.scheduled_date = CURRENT_DATE
  AND sl.status = 'scheduled'
ORDER BY sl.scheduled_time;

-- View: Tomorrow's lessons per teacher with SECURITY INVOKER
CREATE VIEW teacher_tomorrows_lessons WITH (security_invoker = on) AS
SELECT 
  sl.scheduled_lesson_id,
  sl.teacher_id,
  t.name as teacher_name,
  sl.student_id,
  s.name as student_name,
  s.wallet_balance,
  s.status as student_status,
  sl.scheduled_time,
  sl.duration_minutes,
  sl.status,
  p.name as program_name,
  s.student_level
FROM scheduled_lessons sl
JOIN teachers t ON sl.teacher_id = t.teacher_id
JOIN students s ON sl.student_id = s.student_id
LEFT JOIN programs p ON s.program_id = p.program_id
WHERE sl.scheduled_date = CURRENT_DATE + INTERVAL '1 day'
  AND sl.status = 'scheduled'
ORDER BY sl.scheduled_time;

-- View: This week's lessons per teacher with SECURITY INVOKER
CREATE VIEW teacher_week_lessons WITH (security_invoker = on) AS
SELECT 
  sl.scheduled_lesson_id,
  sl.teacher_id,
  t.name as teacher_name,
  sl.student_id,
  s.name as student_name,
  s.wallet_balance,
  s.status as student_status,
  sl.scheduled_date,
  sl.scheduled_time,
  sl.duration_minutes,
  sl.status,
  p.name as program_name,
  s.student_level
FROM scheduled_lessons sl
JOIN teachers t ON sl.teacher_id = t.teacher_id
JOIN students s ON sl.student_id = s.student_id
LEFT JOIN programs p ON s.program_id = p.program_id
WHERE sl.scheduled_date >= CURRENT_DATE
  AND sl.scheduled_date < CURRENT_DATE + INTERVAL '7 days'
  AND sl.status = 'scheduled'
ORDER BY sl.scheduled_date, sl.scheduled_time;

-- Grant select on views to authenticated users
GRANT SELECT ON teacher_monthly_stats TO authenticated;
GRANT SELECT ON teacher_todays_lessons TO authenticated;
GRANT SELECT ON teacher_tomorrows_lessons TO authenticated;
GRANT SELECT ON teacher_week_lessons TO authenticated;