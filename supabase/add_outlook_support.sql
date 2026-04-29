-- ============================================================
-- Outlook / Office 365 support migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Create outlook_tokens table ───────────────────────────
CREATE TABLE IF NOT EXISTS public.outlook_tokens (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  display_name  TEXT,
  access_token  TEXT,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.outlook_tokens ENABLE ROW LEVEL SECURITY;

-- ── 2. RLS policies for outlook_tokens ───────────────────────
-- INSERT stays service-role only (OAuth callback uses admin client)
DROP POLICY IF EXISTS "outlook_tokens_select" ON public.outlook_tokens;
DROP POLICY IF EXISTS "outlook_tokens_update" ON public.outlook_tokens;
DROP POLICY IF EXISTS "outlook_tokens_delete" ON public.outlook_tokens;

CREATE POLICY "outlook_tokens_select" ON public.outlook_tokens
  FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);

CREATE POLICY "outlook_tokens_update" ON public.outlook_tokens
  FOR UPDATE TO authenticated USING (user_id::text = auth.uid()::text);

CREATE POLICY "outlook_tokens_delete" ON public.outlook_tokens
  FOR DELETE TO authenticated USING (user_id::text = auth.uid()::text);

-- ── 3. Add provider column to synced_emails ──────────────────
-- Existing Gmail rows will default to 'gmail'
ALTER TABLE public.synced_emails ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'gmail';

-- Update any existing rows that have no provider set
UPDATE public.synced_emails SET provider = 'gmail' WHERE provider IS NULL;
