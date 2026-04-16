ALTER TABLE public.google_tokens
  ADD COLUMN IF NOT EXISTS calendar_email TEXT,
  ADD COLUMN IF NOT EXISTS calendar_access_token TEXT,
  ADD COLUMN IF NOT EXISTS calendar_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS calendar_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS has_calendar BOOLEAN DEFAULT FALSE;
