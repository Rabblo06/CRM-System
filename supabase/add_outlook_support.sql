-- Add provider column to synced_emails so Gmail and Outlook emails coexist
ALTER TABLE public.synced_emails ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'gmail';

-- RLS policies for outlook_tokens (INSERT is service-role only; read/update/delete per-user)
DROP POLICY IF EXISTS "outlook_tokens_select" ON public.outlook_tokens;
DROP POLICY IF EXISTS "outlook_tokens_update" ON public.outlook_tokens;
DROP POLICY IF EXISTS "outlook_tokens_delete" ON public.outlook_tokens;

CREATE POLICY "outlook_tokens_select" ON public.outlook_tokens
  FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);

CREATE POLICY "outlook_tokens_update" ON public.outlook_tokens
  FOR UPDATE TO authenticated USING (user_id::text = auth.uid()::text);

CREATE POLICY "outlook_tokens_delete" ON public.outlook_tokens
  FOR DELETE TO authenticated USING (user_id::text = auth.uid()::text);
