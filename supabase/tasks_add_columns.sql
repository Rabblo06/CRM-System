-- Tasks table: add task_type and company_id columns
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type  TEXT DEFAULT 'To-do',
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Index for company lookups
CREATE INDEX IF NOT EXISTS idx_tasks_company_id  ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by  ON public.tasks(created_by);

-- Replace the overly-broad "all authenticated" policy with per-user policies
DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON public.tasks;

-- Users can see tasks they created OR are assigned to
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tasks' AND policyname='Users can view own tasks'
  ) THEN
    CREATE POLICY "Users can view own tasks"
      ON public.tasks FOR SELECT
      USING (created_by = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tasks' AND policyname='Users can insert own tasks'
  ) THEN
    CREATE POLICY "Users can insert own tasks"
      ON public.tasks FOR INSERT
      WITH CHECK (created_by = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tasks' AND policyname='Users can update own tasks'
  ) THEN
    CREATE POLICY "Users can update own tasks"
      ON public.tasks FOR UPDATE
      USING (created_by = auth.uid()::text);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='tasks' AND policyname='Users can delete own tasks'
  ) THEN
    CREATE POLICY "Users can delete own tasks"
      ON public.tasks FOR DELETE
      USING (created_by = auth.uid()::text);
  END IF;
END $$;
