-- Add new notification types to enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'lesson_completed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'trial_completed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'new_package';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'daily_summary';
