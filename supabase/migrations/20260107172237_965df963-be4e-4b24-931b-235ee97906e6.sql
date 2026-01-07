-- Create custom types
CREATE TYPE public.student_status AS ENUM ('Active', 'Grace', 'Blocked');
CREATE TYPE public.lead_status AS ENUM ('New', 'Contacted', 'Interested', 'Converted', 'Lost');
CREATE TYPE public.lesson_status AS ENUM ('Taken', 'Absent', 'Cancelled');
CREATE TYPE public.package_status AS ENUM ('Active', 'Completed');
CREATE TYPE public.payroll_status AS ENUM ('Draft', 'Approved', 'Paid');
CREATE TYPE public.notification_type AS ENUM ('low_balance', 'grace_mode', 'blocked', 'renewal_due', 'followup_due');

-- Teachers table
CREATE TABLE public.teachers (
  teacher_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE,
  rate_per_lesson DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes table
CREATE TABLE public.classes (
  class_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  schedule TEXT,
  teacher_id UUID REFERENCES public.teachers(teacher_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads table
CREATE TABLE public.leads (
  lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  source TEXT,
  interest TEXT,
  status public.lead_status DEFAULT 'New',
  next_followup_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_next_followup ON public.leads(next_followup_date);

-- Students table
CREATE TABLE public.students (
  student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  parent_phone TEXT,
  class_id UUID REFERENCES public.classes(class_id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(teacher_id) ON DELETE SET NULL,
  status public.student_status DEFAULT 'Active',
  wallet_balance INTEGER DEFAULT 0,
  current_package_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_status ON public.students(status);
CREATE INDEX idx_students_wallet ON public.students(wallet_balance);
CREATE INDEX idx_students_teacher ON public.students(teacher_id);

-- Packages table
CREATE TABLE public.packages (
  package_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  amount DECIMAL(10,2) NOT NULL,
  lessons_purchased INTEGER NOT NULL,
  lessons_used INTEGER DEFAULT 0,
  status public.package_status DEFAULT 'Active',
  completed_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_packages_student ON public.packages(student_id);
CREATE INDEX idx_packages_status ON public.packages(status);

-- Add foreign key for current_package_id
ALTER TABLE public.students 
ADD CONSTRAINT fk_current_package 
FOREIGN KEY (current_package_id) REFERENCES public.packages(package_id) ON DELETE SET NULL;

-- Lessons log table (using lesson_date as DATE column for uniqueness)
CREATE TABLE public.lessons_log (
  lesson_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ DEFAULT NOW(),
  lesson_date DATE DEFAULT CURRENT_DATE,
  class_id UUID REFERENCES public.classes(class_id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(teacher_id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(student_id) ON DELETE CASCADE,
  status public.lesson_status NOT NULL,
  package_id_used UUID REFERENCES public.packages(package_id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lessons_date ON public.lessons_log(date);
CREATE INDEX idx_lessons_teacher ON public.lessons_log(teacher_id);
CREATE INDEX idx_lessons_student ON public.lessons_log(student_id);
CREATE UNIQUE INDEX idx_lessons_unique_per_day ON public.lessons_log(student_id, class_id, lesson_date);

-- Teachers payroll table
CREATE TABLE public.teachers_payroll (
  payroll_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(teacher_id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  lessons_taken INTEGER DEFAULT 0,
  rate_per_lesson DECIMAL(10,2) NOT NULL,
  amount_due DECIMAL(10,2) NOT NULL,
  status public.payroll_status DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System configuration table
CREATE TABLE public.system_config (
  config_key TEXT PRIMARY KEY,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.system_config (config_key, config_value, description) VALUES
  ('max_debt_lessons', '-2', 'Maximum negative wallet balance allowed'),
  ('grace_period_days', '7', 'Days before blocking after wallet hits 0'),
  ('low_balance_alert', '2', 'Trigger renewal alert when wallet reaches this');

-- Notifications table
CREATE TABLE public.notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.notification_type NOT NULL,
  related_id UUID,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_teachers BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_leads BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_students BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_system_config BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Mark lesson function
CREATE OR REPLACE FUNCTION public.mark_lesson_taken(
  p_student_id UUID,
  p_class_id UUID,
  p_teacher_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_wallet INTEGER;
  v_current_package UUID;
  v_max_debt INTEGER;
  v_new_wallet INTEGER;
  v_new_status public.student_status;
  v_package_to_use UUID;
BEGIN
  SELECT wallet_balance, current_package_id INTO v_wallet, v_current_package
  FROM students WHERE student_id = p_student_id;
  
  SELECT config_value::INTEGER INTO v_max_debt
  FROM system_config WHERE config_key = 'max_debt_lessons';
  
  IF p_status = 'Taken' THEN
    v_new_wallet := v_wallet - 1;
    
    IF v_wallet >= 1 THEN
      v_package_to_use := v_current_package;
      UPDATE packages SET lessons_used = lessons_used + 1 
      WHERE package_id = v_current_package;
    ELSE
      v_package_to_use := NULL;
    END IF;
    
    UPDATE students SET wallet_balance = v_new_wallet WHERE student_id = p_student_id;
    
    IF v_new_wallet > 0 THEN
      v_new_status := 'Active';
    ELSIF v_new_wallet <= v_max_debt THEN
      v_new_status := 'Blocked';
    ELSE
      v_new_status := 'Grace';
    END IF;
    
    UPDATE students SET status = v_new_status WHERE student_id = p_student_id;
    
    IF v_new_wallet = 2 THEN
      INSERT INTO notifications (type, related_id, message)
      VALUES ('low_balance', p_student_id, 'Student needs renewal soon');
    ELSIF v_new_wallet = 0 THEN
      INSERT INTO notifications (type, related_id, message)
      VALUES ('grace_mode', p_student_id, 'Student entered grace period');
    ELSIF v_new_wallet <= v_max_debt THEN
      INSERT INTO notifications (type, related_id, message)
      VALUES ('blocked', p_student_id, 'Student BLOCKED - exceeded debt limit');
    END IF;
  ELSE
    v_package_to_use := NULL;
    v_new_wallet := v_wallet;
    SELECT status INTO v_new_status FROM students WHERE student_id = p_student_id;
  END IF;
  
  INSERT INTO lessons_log (student_id, class_id, teacher_id, status, package_id_used, notes, lesson_date)
  VALUES (p_student_id, p_class_id, p_teacher_id, p_status::public.lesson_status, v_package_to_use, p_notes, CURRENT_DATE);
  
  RETURN json_build_object(
    'success', true,
    'new_wallet', v_new_wallet,
    'new_status', v_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add package with debt handling function
CREATE OR REPLACE FUNCTION public.add_package_with_debt(
  p_student_id UUID,
  p_amount DECIMAL,
  p_lessons_purchased INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_old_wallet INTEGER;
  v_debt_covered INTEGER := 0;
  v_new_wallet INTEGER;
  v_package_id UUID;
  v_new_status public.student_status;
BEGIN
  SELECT wallet_balance INTO v_old_wallet FROM students WHERE student_id = p_student_id;
  
  IF v_old_wallet < 0 THEN
    v_debt_covered := LEAST(ABS(v_old_wallet), p_lessons_purchased);
  END IF;
  
  v_new_wallet := v_old_wallet + p_lessons_purchased;
  
  INSERT INTO packages (student_id, amount, lessons_purchased, lessons_used)
  VALUES (p_student_id, p_amount, p_lessons_purchased, v_debt_covered)
  RETURNING package_id INTO v_package_id;
  
  IF v_new_wallet > 0 THEN
    v_new_status := 'Active';
  ELSE
    v_new_status := 'Grace';
  END IF;
  
  UPDATE students 
  SET wallet_balance = v_new_wallet,
      current_package_id = v_package_id,
      status = v_new_status
  WHERE student_id = p_student_id;
  
  RETURN json_build_object(
    'success', true,
    'package_id', v_package_id,
    'old_wallet', v_old_wallet,
    'new_wallet', v_new_wallet,
    'debt_covered', v_debt_covered
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (admin system)
CREATE POLICY "Allow all for teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for packages" ON public.packages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for lessons_log" ON public.lessons_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for teachers_payroll" ON public.teachers_payroll FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for system_config" ON public.system_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);