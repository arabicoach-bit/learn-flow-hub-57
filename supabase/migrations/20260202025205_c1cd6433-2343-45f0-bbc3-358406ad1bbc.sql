-- Add new fields to leads table based on Excel CRM structure
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS first_contact_date date,
  ADD COLUMN IF NOT EXISTS last_contact_date date,
  ADD COLUMN IF NOT EXISTS trial_status text,
  ADD COLUMN IF NOT EXISTS follow_up text,
  ADD COLUMN IF NOT EXISTS handled_by text;

-- Update existing date column to be first_contact_date if null
UPDATE public.leads 
SET first_contact_date = date::date 
WHERE first_contact_date IS NULL AND date IS NOT NULL;