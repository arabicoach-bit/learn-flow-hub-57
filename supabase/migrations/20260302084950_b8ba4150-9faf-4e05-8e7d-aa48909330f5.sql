
-- Convert any existing 'Taken' or 'taken' records
UPDATE scheduled_lessons SET status = 'completed' WHERE status = 'Taken';
UPDATE scheduled_lessons SET status = 'completed' WHERE status = 'taken';

-- Add constraint to prevent 'Taken' from ever being inserted again
ALTER TABLE scheduled_lessons DROP CONSTRAINT IF EXISTS valid_lesson_status;
ALTER TABLE scheduled_lessons ADD CONSTRAINT valid_lesson_status CHECK (status IN ('scheduled', 'completed', 'absent'));
