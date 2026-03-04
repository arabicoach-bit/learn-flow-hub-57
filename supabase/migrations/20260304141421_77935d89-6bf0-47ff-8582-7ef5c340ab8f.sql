
-- Add payment_status column to packages table
ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Pending';

-- Set existing packages: if payment_received = true, mark as Paid
UPDATE public.packages 
SET payment_status = 'Paid' 
WHERE payment_received = true;
