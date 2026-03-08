
-- Allow teachers to read notifications for their own students and trial students
CREATE POLICY "Teachers can view notifications for own students"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.student_id = notifications.related_id
      AND s.teacher_id = get_user_teacher_id(auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.trial_students ts
    WHERE ts.trial_id = notifications.related_id
      AND ts.teacher_id = get_user_teacher_id(auth.uid())
  )
);
