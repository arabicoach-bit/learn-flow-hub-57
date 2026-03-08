
CREATE TABLE public.teacher_bonuses (
  bonus_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.teachers(teacher_id) ON DELETE CASCADE NOT NULL,
  month_year text NOT NULL, -- format: 'YYYY-MM'
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(teacher_id, month_year)
);

ALTER TABLE public.teacher_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access teacher_bonuses"
ON public.teacher_bonuses FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers view own bonuses"
ON public.teacher_bonuses FOR SELECT
TO authenticated
USING (teacher_id = get_user_teacher_id(auth.uid()));
