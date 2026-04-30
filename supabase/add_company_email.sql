-- Add email column to companies table (was in TypeScript type but missing from DB)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;
