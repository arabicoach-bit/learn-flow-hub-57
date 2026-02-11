-- Allow teachers to insert scheduled_lessons for their own students
CREATE POLICY "Teachers can insert own scheduled_lessons"
ON public.scheduled_lessons
FOR INSERT
WITH CHECK (teacher_id = get_user_teacher_id(auth.uid()));
