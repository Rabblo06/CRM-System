-- Allow users to update their own synced emails (e.g. mark as read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'synced_emails'
      AND policyname = 'Users update own synced emails'
  ) THEN
    CREATE POLICY "Users update own synced emails"
      ON public.synced_emails FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
