-- Remove teacher INSERT policy on scheduled_lessons (teachers cannot add lessons)
DROP POLICY IF EXISTS "Teachers can insert own scheduled_lessons" ON scheduled_lessons;