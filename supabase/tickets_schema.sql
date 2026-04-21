-- Tickets table for support ticket management
-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.tickets (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subject      TEXT NOT NULL,
  description  TEXT,
  status       TEXT DEFAULT 'new'
    CHECK (status IN ('new', 'waiting_contact', 'waiting_us', 'closed')),
  priority     TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  source       TEXT DEFAULT 'Other',
  owner_name   TEXT,
  contact_id   UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id   UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS tickets_created_by_idx ON public.tickets(created_by);
CREATE INDEX IF NOT EXISTS tickets_status_idx     ON public.tickets(status);
CREATE INDEX IF NOT EXISTS tickets_contact_idx    ON public.tickets(contact_id);
CREATE INDEX IF NOT EXISTS tickets_company_idx    ON public.tickets(company_id);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see/manage their own tickets
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "tickets_delete" ON public.tickets
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
