
CREATE TABLE public.trial_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id UUID NOT NULL REFERENCES public.trial_students(trial_id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trial_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access trial_comments"
ON public.trial_comments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers view own trial comments"
ON public.trial_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trial_students ts
    WHERE ts.trial_id = trial_comments.trial_id
    AND ts.teacher_id = get_user_teacher_id(auth.uid())
  )
);

CREATE POLICY "Teachers insert own trial comments"
ON public.trial_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trial_students ts
    WHERE ts.trial_id = trial_comments.trial_id
    AND ts.teacher_id = get_user_teacher_id(auth.uid())
  )
);
