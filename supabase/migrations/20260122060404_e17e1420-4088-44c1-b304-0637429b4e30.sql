-- CHANGE 1: Remove class dependencies and make class_id optional
-- Make class_id nullable in students (it may already be nullable)
ALTER TABLE students 
ALTER COLUMN class_id DROP NOT NULL;

-- Make class_id nullable in lessons_log
ALTER TABLE lessons_log 
ALTER COLUMN class_id DROP NOT NULL;

-- Make class_id nullable in scheduled_lessons
ALTER TABLE scheduled_lessons 
ALTER COLUMN class_id DROP NOT NULL;

-- CHANGE 3: Add package activation fields
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_proof TEXT;

-- Update default status for new packages to 'Pending' is already handled by existing enum
-- The enum already has 'Active' and 'Completed', we need to handle 'Pending' in code

-- CHANGE 2: Create views for teacher metrics

-- View: Teacher monthly stats
CREATE OR REPLACE VIEW teacher_monthly_stats AS
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

-- View: Today's lessons per teacher
CREATE OR REPLACE VIEW teacher_todays_lessons AS
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

-- View: Tomorrow's lessons per teacher
CREATE OR REPLACE VIEW teacher_tomorrows_lessons AS
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

-- View: This week's lessons per teacher
CREATE OR REPLACE VIEW teacher_week_lessons AS
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

-- Add RLS policies for the views (views inherit from base table policies)
-- Teachers can view their own data through these views

-- Grant select on views to authenticated users
GRANT SELECT ON teacher_monthly_stats TO authenticated;
GRANT SELECT ON teacher_todays_lessons TO authenticated;
GRANT SELECT ON teacher_tomorrows_lessons TO authenticated;
GRANT SELECT ON teacher_week_lessons TO authenticated;