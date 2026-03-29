
-- Create student_comments table
CREATE TABLE public.student_comments (
  comment_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_comments ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access student_comments"
  ON public.student_comments
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Teachers can view comments for their students
CREATE POLICY "Teachers view own student comments"
  ON public.student_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.student_id = student_comments.student_id
        AND s.teacher_id = get_user_teacher_id(auth.uid())
    )
  );

-- Teachers can insert comments for their students
CREATE POLICY "Teachers insert own student comments"
  ON public.student_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.student_id = student_comments.student_id
        AND s.teacher_id = get_user_teacher_id(auth.uid())
    )
  );

-- Index for fast lookups
CREATE INDEX idx_student_comments_student_id ON public.student_comments(student_id);
CREATE INDEX idx_student_comments_created_at ON public.student_comments(created_at DESC);
