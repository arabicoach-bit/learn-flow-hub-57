
-- Create package_comments table
CREATE TABLE public.package_comments (
  comment_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.packages(package_id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.package_comments ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access package_comments"
ON public.package_comments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Teachers can view comments for packages of their students
CREATE POLICY "Teachers view own package comments"
ON public.package_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM packages p
    JOIN students s ON p.student_id = s.student_id
    WHERE p.package_id = package_comments.package_id
    AND (s.teacher_id = get_user_teacher_id(auth.uid())
      OR EXISTS (
        SELECT 1 FROM scheduled_lessons sl
        WHERE sl.student_id = s.student_id
        AND sl.teacher_id = get_user_teacher_id(auth.uid())
      ))
  )
);

-- Teachers can insert comments for packages of their students
CREATE POLICY "Teachers insert own package comments"
ON public.package_comments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM packages p
    JOIN students s ON p.student_id = s.student_id
    WHERE p.package_id = package_comments.package_id
    AND (s.teacher_id = get_user_teacher_id(auth.uid())
      OR EXISTS (
        SELECT 1 FROM scheduled_lessons sl
        WHERE sl.student_id = s.student_id
        AND sl.teacher_id = get_user_teacher_id(auth.uid())
      ))
  )
);

-- Index for fast lookups
CREATE INDEX idx_package_comments_package_id ON public.package_comments(package_id);
