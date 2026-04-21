-- Fix tasks table RLS policies
-- Run this in Supabase Dashboard → SQL Editor
-- This replaces all existing task policies with clean working ones

-- 1. Drop every existing policy on tasks (safe to run multiple times)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'tasks' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', r.policyname);
  END LOOP;
END $$;

-- 2. Make sure RLS is enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. Recreate simple, working policies
--    created_by is stored as TEXT; auth.uid() returns UUID → cast to text

CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (created_by = auth.uid()::text);

CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid()::text);

CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (created_by = auth.uid()::text);
