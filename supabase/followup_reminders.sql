-- Smart Follow-up Reminders Migration
-- Run this in your Supabase SQL Editor

-- ── 1. Add follow-up tracking columns to synced_emails ──────────────────────
ALTER TABLE public.synced_emails
  ADD COLUMN IF NOT EXISTS sent_by_user      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_reply_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_enabled BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_days    INTEGER     NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS follow_up_task_id UUID        REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMPTZ;

-- Index: find emails needing follow-up fast
CREATE INDEX IF NOT EXISTS idx_synced_emails_followup
  ON public.synced_emails (follow_up_enabled, last_reply_at, follow_up_sent_at, sent_by_user)
  WHERE follow_up_enabled = true AND follow_up_sent_at IS NULL AND sent_by_user = true;

-- ── 2. Allow users to INSERT their own sent emails ───────────────────────────
-- Cast both sides to text to avoid text = uuid type mismatch
DROP POLICY IF EXISTS "Users insert own synced emails" ON public.synced_emails;
CREATE POLICY "Users insert own synced emails"
  ON public.synced_emails FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own synced emails" ON public.synced_emails;
CREATE POLICY "Users update own synced emails"
  ON public.synced_emails FOR UPDATE
  USING (user_id::text = auth.uid()::text);

-- Also fix the existing SELECT / DELETE policies to use the same cast
DROP POLICY IF EXISTS "Users see own synced emails" ON public.synced_emails;
CREATE POLICY "Users see own synced emails"
  ON public.synced_emails FOR SELECT
  USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own synced emails" ON public.synced_emails;
CREATE POLICY "Users delete own synced emails"
  ON public.synced_emails FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- ── 3. Allow users to manage their own tasks ────────────────────────────────
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own tasks" ON public.tasks;
CREATE POLICY "Users insert own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (created_by::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users select own tasks" ON public.tasks;
CREATE POLICY "Users select own tasks"
  ON public.tasks FOR SELECT
  USING (created_by::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own tasks" ON public.tasks;
CREATE POLICY "Users update own tasks"
  ON public.tasks FOR UPDATE
  USING (created_by::text = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own tasks" ON public.tasks;
CREATE POLICY "Users delete own tasks"
  ON public.tasks FOR DELETE
  USING (created_by::text = auth.uid()::text);
