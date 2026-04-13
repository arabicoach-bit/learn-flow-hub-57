CREATE POLICY "Teachers update own trial reports"
ON public.trial_reports
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trial_students ts
    WHERE ts.trial_id = trial_reports.trial_id
      AND ts.teacher_id = get_user_teacher_id(auth.uid())
  )
);