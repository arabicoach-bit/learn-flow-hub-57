ALTER TABLE public.trial_students 
ADD COLUMN IF NOT EXISTS follow_up text,
ADD COLUMN IF NOT EXISTS last_contact_date date;