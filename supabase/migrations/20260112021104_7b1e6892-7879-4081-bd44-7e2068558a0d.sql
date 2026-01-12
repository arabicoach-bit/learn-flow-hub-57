-- Create function to check for renewal reminders when a lesson is marked
CREATE OR REPLACE FUNCTION public.check_renewal_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_package_id UUID;
  v_lessons_purchased INTEGER;
  v_lessons_used INTEGER;
  v_lessons_remaining INTEGER;
  v_student_id UUID;
  v_student_name TEXT;
  v_existing_notification UUID;
BEGIN
  -- Only proceed if status is Taken
  IF NEW.status != 'Taken' THEN
    RETURN NEW;
  END IF;
  
  -- Get the package info
  v_package_id := NEW.package_id_used;
  IF v_package_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT lessons_purchased, lessons_used, student_id
  INTO v_lessons_purchased, v_lessons_used, v_student_id
  FROM packages
  WHERE package_id = v_package_id;
  
  IF v_student_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get student name
  SELECT name INTO v_student_name FROM students WHERE student_id = v_student_id;
  
  v_lessons_remaining := v_lessons_purchased - v_lessons_used;
  
  -- Check if package is 80% used (20% remaining) - trigger renewal reminder
  IF v_lessons_remaining <= CEIL(v_lessons_purchased * 0.2) AND v_lessons_remaining > 0 THEN
    -- Check if we already have an unread notification for this
    SELECT notification_id INTO v_existing_notification
    FROM notifications
    WHERE related_id = v_student_id 
      AND type = 'renewal_due' 
      AND is_read = false
    LIMIT 1;
    
    IF v_existing_notification IS NULL THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES (
        'renewal_due', 
        v_student_id, 
        'Package for ' || v_student_name || ' is nearly complete. Only ' || v_lessons_remaining || ' lessons remaining out of ' || v_lessons_purchased || '. Contact parent for renewal.',
        v_student_name,
        v_lessons_remaining
      );
    END IF;
  END IF;
  
  -- Check if package is completely used
  IF v_lessons_remaining = 0 THEN
    -- Mark package as completed
    UPDATE packages
    SET status = 'Completed', completed_date = NOW()
    WHERE package_id = v_package_id AND status = 'Active';
    
    -- Check for existing notification
    SELECT notification_id INTO v_existing_notification
    FROM notifications
    WHERE related_id = v_student_id 
      AND type = 'renewal_due' 
      AND message LIKE '%package has been COMPLETED%'
      AND is_read = false
    LIMIT 1;
    
    IF v_existing_notification IS NULL THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES (
        'renewal_due', 
        v_student_id, 
        'URGENT: Package for ' || v_student_name || ' has been COMPLETED. All ' || v_lessons_purchased || ' lessons used. Renewal required immediately!',
        v_student_name,
        0
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on lessons_log
DROP TRIGGER IF EXISTS trigger_check_renewal_reminder ON lessons_log;
CREATE TRIGGER trigger_check_renewal_reminder
AFTER INSERT ON lessons_log
FOR EACH ROW
EXECUTE FUNCTION check_renewal_reminder();

-- Also create a function to check scheduled lessons progress
CREATE OR REPLACE FUNCTION public.check_package_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_student_id UUID;
  v_student_name TEXT;
  v_lessons_remaining INTEGER;
  v_existing_notification UUID;
BEGIN
  -- Only proceed when status changes to completed
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.package_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count total and completed scheduled lessons for this package
  SELECT 
    COUNT(*), 
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO v_total_lessons, v_completed_lessons
  FROM scheduled_lessons
  WHERE package_id = NEW.package_id;
  
  v_lessons_remaining := v_total_lessons - v_completed_lessons;
  v_student_id := NEW.student_id;
  
  IF v_student_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get student name
  SELECT name INTO v_student_name FROM students WHERE student_id = v_student_id;
  
  -- Check if 80% complete (20% remaining)
  IF v_lessons_remaining <= CEIL(v_total_lessons * 0.2) AND v_lessons_remaining > 0 THEN
    -- Check for existing unread notification
    SELECT notification_id INTO v_existing_notification
    FROM notifications
    WHERE related_id = v_student_id 
      AND type = 'renewal_due' 
      AND is_read = false
    LIMIT 1;
    
    IF v_existing_notification IS NULL THEN
      INSERT INTO notifications (type, related_id, message, student_name, wallet_balance)
      VALUES (
        'renewal_due', 
        v_student_id, 
        'Package for ' || v_student_name || ' is nearly complete. Only ' || v_lessons_remaining || ' scheduled lessons remaining. Contact parent for renewal.',
        v_student_name,
        v_lessons_remaining
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on scheduled_lessons
DROP TRIGGER IF EXISTS trigger_check_package_progress ON scheduled_lessons;
CREATE TRIGGER trigger_check_package_progress
AFTER UPDATE ON scheduled_lessons
FOR EACH ROW
EXECUTE FUNCTION check_package_progress();