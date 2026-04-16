-- User Settings Table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Calendar
  calendar_sync         BOOLEAN NOT NULL DEFAULT true,
  tasks_calendar_sync   BOOLEAN NOT NULL DEFAULT false,
  meeting_scheduling    BOOLEAN NOT NULL DEFAULT false,
  out_of_office         BOOLEAN NOT NULL DEFAULT false,
  availability_calendar TEXT    NOT NULL DEFAULT '',
  -- Email
  email_tracking        BOOLEAN NOT NULL DEFAULT true,
  log_to_crm            BOOLEAN NOT NULL DEFAULT true,
  -- Calling
  auto_log_calls        BOOLEAN NOT NULL DEFAULT true,
  -- Notifications
  notif_deal_stage      BOOLEAN NOT NULL DEFAULT true,
  notif_new_contact     BOOLEAN NOT NULL DEFAULT true,
  notif_task_due        BOOLEAN NOT NULL DEFAULT true,
  notif_meeting_reminder BOOLEAN NOT NULL DEFAULT true,
  notif_email_open      BOOLEAN NOT NULL DEFAULT false,
  notif_email_click     BOOLEAN NOT NULL DEFAULT false,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_settings" ON public.user_settings;
CREATE POLICY "users_own_settings"
  ON public.user_settings
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS user_settings_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- If the table already exists, add missing columns:
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS auto_log_calls         BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notif_deal_stage       BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notif_new_contact      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notif_task_due         BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notif_meeting_reminder BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notif_email_open       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS notif_email_click      BOOLEAN NOT NULL DEFAULT false;
