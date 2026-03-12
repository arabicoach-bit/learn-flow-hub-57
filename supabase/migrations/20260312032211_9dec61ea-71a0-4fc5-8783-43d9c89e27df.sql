
-- Step 1: Add tracking columns to scheduled_lessons
ALTER TABLE public.scheduled_lessons
  ADD COLUMN IF NOT EXISTS wallet_deducted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wallet_deducted_at timestamptz;

-- Backfill: mark existing completed lessons as already deducted
UPDATE public.scheduled_lessons
SET wallet_deducted = true, wallet_deducted_at = now()
WHERE status = 'completed' AND wallet_deducted = false;

-- Step 2: Create the centralized trigger function
CREATE OR REPLACE FUNCTION public.trigger_wallet_sync_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- CASE 1: Lesson becomes 'completed' and has NOT been deducted yet
  IF NEW.status = 'completed' AND NEW.wallet_deducted = false THEN
    -- Deduct 1 from wallet
    UPDATE public.students
    SET wallet_balance = GREATEST(wallet_balance - 1, 0)
    WHERE student_id = NEW.student_id;

    NEW.wallet_deducted := true;
    NEW.wallet_deducted_at := now();
  END IF;

  -- CASE 2: Lesson was completed (deducted) but now changed back to scheduled/absent
  IF NEW.status IN ('scheduled', 'absent')
     AND OLD.status = 'completed'
     AND OLD.wallet_deducted = true THEN
    -- Restore 1 to wallet
    UPDATE public.students
    SET wallet_balance = wallet_balance + 1
    WHERE student_id = NEW.student_id;

    NEW.wallet_deducted := false;
    NEW.wallet_deducted_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Attach as BEFORE UPDATE trigger (so we can modify NEW)
CREATE TRIGGER scheduled_lessons_wallet_sync
  BEFORE UPDATE ON public.scheduled_lessons
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.trigger_wallet_sync_on_status_change();
