-- ============================================================
-- Gmail Sync Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Google OAuth tokens (server-side only, no user RLS policies)
CREATE TABLE IF NOT EXISTS public.google_tokens (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_email TEXT NOT NULL,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  scope         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Only service role can read/write tokens (no user-level access)
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE policies — only service role key can access


-- 2. Synced emails
CREATE TABLE IF NOT EXISTS public.synced_emails (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id  TEXT,
  subject          TEXT,
  from_email       TEXT NOT NULL,
  from_name        TEXT,
  to_email         TEXT,
  body_preview     TEXT,
  received_at      TIMESTAMPTZ,
  is_read          BOOLEAN DEFAULT FALSE,
  contact_id       UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id       UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, gmail_message_id)
);

ALTER TABLE public.synced_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own synced emails"
  ON public.synced_emails FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own synced emails"
  ON public.synced_emails FOR DELETE
  USING (user_id = auth.uid());


-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_synced_emails_user_id ON public.synced_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_contact_id ON public.synced_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_company_id ON public.synced_emails(company_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_received_at ON public.synced_emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON public.google_tokens(user_id);


-- 4. Add source column to contacts (if not exists) to track where contacts came from
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS source TEXT;
