
-- Add 'Absent' to the existing trial_status enum
ALTER TYPE public.trial_status ADD VALUE IF NOT EXISTS 'Absent';

-- Create new enum for conversion tracking
CREATE TYPE public.trial_conversion_status AS ENUM ('Pending', 'Converted', 'Lost');

-- Add conversion_status column to trial_students
ALTER TABLE public.trial_students 
ADD COLUMN conversion_status public.trial_conversion_status NOT NULL DEFAULT 'Pending';

-- Migrate existing data: if status was 'Converted', set conversion_status to 'Converted' and status to 'Completed'
-- if status was 'Lost', set conversion_status to 'Lost' and status to 'Completed'
UPDATE public.trial_students SET conversion_status = 'Converted' WHERE status = 'Converted';
UPDATE public.trial_students SET conversion_status = 'Lost' WHERE status = 'Lost';
UPDATE public.trial_students SET status = 'Completed' WHERE status IN ('Converted', 'Lost');
