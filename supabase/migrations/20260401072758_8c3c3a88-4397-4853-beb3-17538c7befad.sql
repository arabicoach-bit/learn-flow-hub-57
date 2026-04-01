ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE;

UPDATE public.students
SET status_changed_at = COALESCE(updated_at, created_at, now())
WHERE status_changed_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_student_status_changed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status_changed_at := COALESCE(NEW.status_changed_at, NEW.updated_at, NEW.created_at, now());
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  ELSIF NEW.status_changed_at IS NULL THEN
    NEW.status_changed_at := COALESCE(OLD.status_changed_at, NEW.updated_at, OLD.updated_at, NEW.created_at, OLD.created_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_student_status_changed_at_on_students ON public.students;

CREATE TRIGGER set_student_status_changed_at_on_students
BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.set_student_status_changed_at();