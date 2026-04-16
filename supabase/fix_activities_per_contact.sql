-- ============================================================
-- Fix: Activities per-contact isolation
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add missing columns used by the CRM activity types
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS location  TEXT;

-- 2. Fix RLS: currently allows ALL authenticated users to see ALL activities.
--    Replace with user-scoped policy so each user only sees their own.
DROP POLICY IF EXISTS "Authenticated users can manage activities" ON public.activities;

CREATE POLICY "Users can manage own activities" ON public.activities
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND (user_id = auth.uid()::text OR user_id IS NULL)
  );

-- 3. Index for faster per-contact queries
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
