-- Add missing columns to companies table (idempotent)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email        TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS mobile       TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS manager_name TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email_note   TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS next_step    TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status       TEXT;
