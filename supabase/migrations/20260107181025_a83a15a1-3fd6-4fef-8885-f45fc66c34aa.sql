-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher');

-- Create profiles table for user metadata
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(teacher_id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create indexes
CREATE INDEX idx_profiles_teacher ON profiles(teacher_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's teacher_id
CREATE OR REPLACE FUNCTION public.get_user_teacher_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT teacher_id FROM public.profiles WHERE id = _user_id
$$;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = auth.uid());

-- RLS policies for user_roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Update existing tables with proper RLS policies

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all for students" ON students;
DROP POLICY IF EXISTS "Allow all for lessons_log" ON lessons_log;
DROP POLICY IF EXISTS "Allow all for teachers_payroll" ON teachers_payroll;
DROP POLICY IF EXISTS "Allow all for leads" ON leads;
DROP POLICY IF EXISTS "Allow all for packages" ON packages;
DROP POLICY IF EXISTS "Allow all for classes" ON classes;
DROP POLICY IF EXISTS "Allow all for teachers" ON teachers;
DROP POLICY IF EXISTS "Allow all for notifications" ON notifications;
DROP POLICY IF EXISTS "Allow all for system_config" ON system_config;

-- Students policies
CREATE POLICY "Admins full access students"
ON students FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers see own students"
ON students FOR SELECT TO authenticated
USING (teacher_id = public.get_user_teacher_id(auth.uid()));

-- Lessons log policies
CREATE POLICY "Admins full access lessons"
ON lessons_log FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers see own lessons"
ON lessons_log FOR SELECT TO authenticated
USING (teacher_id = public.get_user_teacher_id(auth.uid()));

CREATE POLICY "Teachers insert own lessons"
ON lessons_log FOR INSERT TO authenticated
WITH CHECK (teacher_id = public.get_user_teacher_id(auth.uid()));

-- Teachers payroll policies
CREATE POLICY "Admins full access payroll"
ON teachers_payroll FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers see own payroll"
ON teachers_payroll FOR SELECT TO authenticated
USING (teacher_id = public.get_user_teacher_id(auth.uid()));

-- Leads policies (admin only)
CREATE POLICY "Admin only leads"
ON leads FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Packages policies (admin only)
CREATE POLICY "Admin only packages"
ON packages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Classes policies
CREATE POLICY "Admins full access classes"
ON classes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers see own classes"
ON classes FOR SELECT TO authenticated
USING (teacher_id = public.get_user_teacher_id(auth.uid()));

-- Teachers policies
CREATE POLICY "Admins full access teachers"
ON teachers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers see own teacher record"
ON teachers FOR SELECT TO authenticated
USING (teacher_id = public.get_user_teacher_id(auth.uid()));

-- Notifications policies
CREATE POLICY "Admins full access notifications"
ON notifications FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- System config policies (admin only)
CREATE POLICY "Admin only system_config"
ON system_config FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));