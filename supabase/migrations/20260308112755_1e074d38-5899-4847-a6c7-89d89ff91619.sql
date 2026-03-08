
-- Fix packages that have no remaining scheduled lessons: mark them as Completed
-- and sync lessons_used with actual completed lesson count
UPDATE packages p
SET 
  status = 'Completed',
  completed_date = COALESCE(p.completed_date, now()),
  lessons_used = (
    SELECT COUNT(*) FROM scheduled_lessons sl 
    WHERE sl.package_id = p.package_id AND sl.status = 'completed'
  )
WHERE p.status = 'Active'
AND NOT EXISTS (
  SELECT 1 FROM scheduled_lessons sl 
  WHERE sl.package_id = p.package_id AND sl.status = 'scheduled'
);

-- Also sync lessons_used for all Active packages to prevent future drift
UPDATE packages p
SET lessons_used = (
  SELECT COUNT(*) FROM scheduled_lessons sl 
  WHERE sl.package_id = p.package_id AND sl.status = 'completed'
)
WHERE p.status = 'Active';
