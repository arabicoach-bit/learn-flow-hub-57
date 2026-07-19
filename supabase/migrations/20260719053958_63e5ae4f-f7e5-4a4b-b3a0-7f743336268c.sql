-- Require authentication for packages, teachers, notifications SELECTs
-- Fix packages teacher policy to only apply to authenticated role
DROP POLICY IF EXISTS "Teachers can view packages for own students" ON public.packages;
CREATE POLICY "Teachers can view packages for own students"
ON public.packages FOR SELECT TO authenticated
USING (
  (EXISTS (SELECT 1 FROM students s WHERE s.student_id = packages.student_id AND s.teacher_id = get_user_teacher_id(auth.uid())))
  OR (EXISTS (SELECT 1 FROM scheduled_lessons sl WHERE sl.package_id = packages.package_id AND sl.teacher_id = get_user_teacher_id(auth.uid())))
);

-- Add explicit deny for anonymous access via restrictive policies
CREATE POLICY "Require authentication" ON public.packages
AS RESTRICTIVE FOR ALL TO public
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication" ON public.teachers
AS RESTRICTIVE FOR ALL TO public
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication" ON public.notifications
AS RESTRICTIVE FOR ALL TO public
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Revoke anon grants on these tables (defense in depth)
REVOKE ALL ON public.packages FROM anon;
REVOKE ALL ON public.teachers FROM anon;
REVOKE ALL ON public.notifications FROM anon;