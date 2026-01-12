-- Create programs table
CREATE TABLE public.programs (
  program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on programs
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- RLS policies for programs
CREATE POLICY "Admins full access programs" ON public.programs
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view programs" ON public.programs
FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role));

-- Insert default programs
INSERT INTO public.programs (name, description) VALUES
('Arabic A', 'Advanced Arabic program'),
('Arabic B', 'Standard Arabic program'),
('Islamic Studies', 'Islamic education program'),
('Social Studies', 'Social studies program');

-- Create package_types table
CREATE TABLE public.package_types (
  package_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  lessons_per_week INTEGER,
  lesson_duration INTEGER,
  monthly_fee DECIMAL(10,2),
  total_lessons INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on package_types
ALTER TABLE public.package_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for package_types
CREATE POLICY "Admins full access package_types" ON public.package_types
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view package_types" ON public.package_types
FOR SELECT USING (has_role(auth.uid(), 'teacher'::app_role));

-- Insert default package types
INSERT INTO public.package_types (name, description, lessons_per_week, lesson_duration, monthly_fee, total_lessons) VALUES
('Light', '1 lesson/week - 30 mins', 1, 30, 150.00, 4),
('Standard', '2 lessons/week - 45 mins', 2, 45, 250.00, 8),
('Best Value', '2 lessons/week - 60 mins', 2, 60, 350.00, 8),
('Premium', '3 lessons/week - 60 mins', 3, 60, 500.00, 12);

-- Create lesson_schedules table (Weekly recurring schedule template)
CREATE TABLE public.lesson_schedules (
  schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.packages(package_id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  time_slot TIME NOT NULL,
  timezone TEXT DEFAULT 'Asia/Dubai',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on lesson_schedules
ALTER TABLE public.lesson_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for lesson_schedules
CREATE POLICY "Admins full access lesson_schedules" ON public.lesson_schedules
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view lesson_schedules" ON public.lesson_schedules
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.packages p
  JOIN public.students s ON p.student_id = s.student_id
  WHERE p.package_id = lesson_schedules.package_id
  AND s.teacher_id = get_user_teacher_id(auth.uid())
));

CREATE INDEX idx_schedule_package ON public.lesson_schedules(package_id);

-- Create scheduled_lessons table (Auto-generated future lessons)
CREATE TABLE public.scheduled_lessons (
  scheduled_lesson_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.packages(package_id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(student_id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(teacher_id),
  class_id UUID REFERENCES public.classes(class_id),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  lesson_log_id UUID REFERENCES public.lessons_log(lesson_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on scheduled_lessons
ALTER TABLE public.scheduled_lessons ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduled_lessons
CREATE POLICY "Admins full access scheduled_lessons" ON public.scheduled_lessons
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view own scheduled_lessons" ON public.scheduled_lessons
FOR SELECT USING (teacher_id = get_user_teacher_id(auth.uid()));

CREATE POLICY "Teachers can update own scheduled_lessons" ON public.scheduled_lessons
FOR UPDATE USING (teacher_id = get_user_teacher_id(auth.uid()));

CREATE INDEX idx_scheduled_student ON public.scheduled_lessons(student_id);
CREATE INDEX idx_scheduled_teacher ON public.scheduled_lessons(teacher_id);
CREATE INDEX idx_scheduled_date ON public.scheduled_lessons(scheduled_date);
CREATE UNIQUE INDEX idx_no_duplicate_scheduled ON public.scheduled_lessons(student_id, scheduled_date, scheduled_time);

-- Update students table with new columns
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS parent_guardian_name TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female')),
ADD COLUMN IF NOT EXISTS nationality TEXT,
ADD COLUMN IF NOT EXISTS school TEXT,
ADD COLUMN IF NOT EXISTS year_group TEXT,
ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(program_id),
ADD COLUMN IF NOT EXISTS student_level TEXT CHECK (student_level IN ('Beginner', 'Elementary', 'Intermediate', 'Advanced')),
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS number_of_renewals INTEGER DEFAULT 0;

-- Update packages table with new columns
ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS package_type_id UUID REFERENCES public.package_types(package_type_id),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS next_payment_date DATE,
ADD COLUMN IF NOT EXISTS lesson_duration INTEGER,
ADD COLUMN IF NOT EXISTS schedule_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_renewal BOOLEAN DEFAULT false;

-- Create function to generate package schedule
CREATE OR REPLACE FUNCTION public.generate_package_schedule(
  p_package_id UUID,
  p_student_id UUID,
  p_teacher_id UUID,
  p_class_id UUID,
  p_start_date DATE,
  p_total_lessons INTEGER,
  p_lesson_duration INTEGER,
  p_schedule_days JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_entry JSONB;
  v_current_date DATE;
  v_lessons_scheduled INTEGER := 0;
  v_scheduled_dates DATE[] := ARRAY[]::DATE[];
  v_day_of_week INTEGER;
  v_time_slot TIME;
  v_week_start DATE;
  v_max_iterations INTEGER := 365;
  v_iteration INTEGER := 0;
BEGIN
  v_current_date := p_start_date;
  v_week_start := p_start_date;
  
  -- Loop until we've scheduled all lessons (with safety limit)
  WHILE v_lessons_scheduled < p_total_lessons AND v_iteration < v_max_iterations LOOP
    v_iteration := v_iteration + 1;
    
    -- Check each day in the schedule for current week
    FOR v_schedule_entry IN SELECT * FROM jsonb_array_elements(p_schedule_days)
    LOOP
      v_day_of_week := (v_schedule_entry->>'day')::INTEGER;
      v_time_slot := (v_schedule_entry->>'time')::TIME;
      
      -- Calculate the date for this day of week in current week
      v_current_date := v_week_start + ((v_day_of_week - EXTRACT(DOW FROM v_week_start)::INTEGER + 7) % 7);
      
      -- Skip if date is before start date
      IF v_current_date < p_start_date THEN
        CONTINUE;
      END IF;
      
      -- Check if we haven't exceeded total lessons
      IF v_lessons_scheduled < p_total_lessons THEN
        -- Insert scheduled lesson (ignore if duplicate)
        BEGIN
          INSERT INTO scheduled_lessons (
            package_id,
            student_id,
            teacher_id,
            class_id,
            scheduled_date,
            scheduled_time,
            duration_minutes,
            status
          ) VALUES (
            p_package_id,
            p_student_id,
            p_teacher_id,
            p_class_id,
            v_current_date,
            v_time_slot,
            p_lesson_duration,
            'scheduled'
          );
          
          v_lessons_scheduled := v_lessons_scheduled + 1;
          v_scheduled_dates := array_append(v_scheduled_dates, v_current_date);
        EXCEPTION WHEN unique_violation THEN
          -- Skip duplicate, continue to next slot
          NULL;
        END;
      END IF;
    END LOOP;
    
    -- Move to next week
    v_week_start := v_week_start + INTERVAL '7 days';
  END LOOP;
  
  -- Mark package as schedule generated
  UPDATE packages 
  SET schedule_generated = true 
  WHERE package_id = p_package_id;
  
  -- Return summary
  RETURN json_build_object(
    'success', true,
    'lessons_scheduled', v_lessons_scheduled,
    'scheduled_dates', v_scheduled_dates,
    'start_date', p_start_date
  );
END;
$$;

-- Data migration for existing students
UPDATE public.students 
SET 
  program_id = (SELECT program_id FROM public.programs WHERE name = 'Arabic A' LIMIT 1),
  student_level = 'Intermediate',
  number_of_renewals = 0,
  total_paid = 0
WHERE program_id IS NULL;

-- Calculate total_paid from existing packages
UPDATE public.students s
SET total_paid = (
  SELECT COALESCE(SUM(amount), 0) 
  FROM public.packages p 
  WHERE p.student_id = s.student_id
);