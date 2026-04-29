-- Add new columns to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS manager_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_note   TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_step    TEXT;

-- Add new columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS mobile       TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS manager_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_note   TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS next_step    TEXT;
