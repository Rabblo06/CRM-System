-- Task Reminders Migration
-- Run this in your Supabase SQL Editor

-- Add reminder columns to existing tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS reminder_minutes  INTEGER,
  ADD COLUMN IF NOT EXISTS reminder_time     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- Index so the cron job query is fast
CREATE INDEX IF NOT EXISTS idx_tasks_reminder
  ON public.tasks (reminder_time, reminder_sent)
  WHERE reminder_sent = false AND reminder_time IS NOT NULL;
