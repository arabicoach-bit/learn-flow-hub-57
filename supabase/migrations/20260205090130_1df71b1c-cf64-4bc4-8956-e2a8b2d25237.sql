-- Add new notification type for unmarked lessons reminder
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'unmarked_lesson_reminder';