
-- Add is_pinned and updated_at to all comment tables
ALTER TABLE public.student_comments ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.student_comments ADD COLUMN updated_at timestamptz DEFAULT NULL;

ALTER TABLE public.trial_comments ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.trial_comments ADD COLUMN updated_at timestamptz DEFAULT NULL;

ALTER TABLE public.package_comments ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.package_comments ADD COLUMN updated_at timestamptz DEFAULT NULL;

ALTER TABLE public.lead_comments ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.lead_comments ADD COLUMN updated_at timestamptz DEFAULT NULL;

-- Add DELETE policies for student_comments (teachers can delete own)
CREATE POLICY "Teachers delete own student comments"
ON public.student_comments FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- Add DELETE policies for trial_comments
CREATE POLICY "Teachers delete own trial comments"
ON public.trial_comments FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- Add UPDATE policies for student_comments (teachers update own)
CREATE POLICY "Teachers update own student comments"
ON public.student_comments FOR UPDATE TO authenticated
USING (author_id = auth.uid());

-- Add UPDATE policies for trial_comments
CREATE POLICY "Teachers update own trial comments"
ON public.trial_comments FOR UPDATE TO authenticated
USING (author_id = auth.uid());

-- Add DELETE policies for package_comments
CREATE POLICY "Teachers delete own package comments"
ON public.package_comments FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- Add UPDATE policies for package_comments
CREATE POLICY "Teachers update own package comments"
ON public.package_comments FOR UPDATE TO authenticated
USING (author_id = auth.uid());
