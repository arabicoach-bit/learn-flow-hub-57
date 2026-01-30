-- Allow teachers to view packages for their own students
CREATE POLICY "Teachers can view packages for own students"
ON public.packages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.student_id = packages.student_id
      AND s.teacher_id = public.get_user_teacher_id(auth.uid())
  )
);