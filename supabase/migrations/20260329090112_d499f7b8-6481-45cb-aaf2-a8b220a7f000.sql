
-- Expand teacher visibility on students: also see students they have scheduled_lessons with
DROP POLICY IF EXISTS "Teachers see own students" ON students;
CREATE POLICY "Teachers see own students" ON students
  FOR SELECT TO authenticated
  USING (
    teacher_id = get_user_teacher_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM scheduled_lessons sl
      WHERE sl.student_id = students.student_id
        AND sl.teacher_id = get_user_teacher_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers can update own students" ON students;
CREATE POLICY "Teachers can update own students" ON students
  FOR UPDATE TO public
  USING (
    teacher_id = get_user_teacher_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM scheduled_lessons sl
      WHERE sl.student_id = students.student_id
        AND sl.teacher_id = get_user_teacher_id(auth.uid())
    )
  )
  WITH CHECK (
    teacher_id = get_user_teacher_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM scheduled_lessons sl
      WHERE sl.student_id = students.student_id
        AND sl.teacher_id = get_user_teacher_id(auth.uid())
    )
  );

-- Expand teacher visibility on packages: also see packages where they teach lessons
DROP POLICY IF EXISTS "Teachers can view packages for own students" ON packages;
CREATE POLICY "Teachers can view packages for own students" ON packages
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.student_id = packages.student_id
        AND s.teacher_id = get_user_teacher_id(auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM scheduled_lessons sl
      WHERE sl.package_id = packages.package_id
        AND sl.teacher_id = get_user_teacher_id(auth.uid())
    )
  );

-- Expand teacher visibility on student_comments
DROP POLICY IF EXISTS "Teachers view own student comments" ON student_comments;
CREATE POLICY "Teachers view own student comments" ON student_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.student_id = student_comments.student_id
        AND (
          s.teacher_id = get_user_teacher_id(auth.uid())
          OR EXISTS (
            SELECT 1 FROM scheduled_lessons sl
            WHERE sl.student_id = s.student_id
              AND sl.teacher_id = get_user_teacher_id(auth.uid())
          )
        )
    )
  );

DROP POLICY IF EXISTS "Teachers insert own student comments" ON student_comments;
CREATE POLICY "Teachers insert own student comments" ON student_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.student_id = student_comments.student_id
        AND (
          s.teacher_id = get_user_teacher_id(auth.uid())
          OR EXISTS (
            SELECT 1 FROM scheduled_lessons sl
            WHERE sl.student_id = s.student_id
              AND sl.teacher_id = get_user_teacher_id(auth.uid())
          )
        )
    )
  );
