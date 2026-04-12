
-- Set existing null trial_status values to 'Pending'
UPDATE public.leads SET trial_status = 'Pending' WHERE trial_status IS NULL;

-- Drop the status column
ALTER TABLE public.leads DROP COLUMN status;

-- Set default for trial_status
ALTER TABLE public.leads ALTER COLUMN trial_status SET DEFAULT 'Pending';
ALTER TABLE public.leads ALTER COLUMN trial_status SET NOT NULL;

-- Drop the now-unused enum type
DROP TYPE IF EXISTS public.lead_status;
