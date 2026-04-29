-- ============================================================
-- CRM System - Complete Fresh Schema
-- Paste this entire file into Supabase SQL Editor and run it.
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── TABLES ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT,
  avatar_url TEXT,
  role       TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.companies (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name           TEXT NOT NULL,
  domain         TEXT,
  industry       TEXT,
  size           TEXT,
  website        TEXT,
  phone          TEXT,
  address        TEXT,
  city           TEXT,
  country        TEXT,
  description    TEXT,
  logo_url       TEXT,
  annual_revenue NUMERIC(15, 2),
  created_by     UUID REFERENCES public.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contacts (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  email            TEXT UNIQUE,
  phone            TEXT,
  mobile           TEXT,
  job_title        TEXT,
  department       TEXT,
  company_id       UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  lead_status      TEXT DEFAULT 'new' CHECK (lead_status IN ('new','contacted','qualified','unqualified','converted')),
  lifecycle_stage  TEXT DEFAULT 'lead' CHECK (lifecycle_stage IN ('lead','marketing_qualified','sales_qualified','opportunity','customer','evangelist')),
  source           TEXT,
  linkedin_url     TEXT,
  twitter_url      TEXT,
  address          TEXT,
  city             TEXT,
  country          TEXT,
  notes            TEXT,
  avatar_url       TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  last_contacted_at TIMESTAMPTZ,
  created_by       UUID REFERENCES public.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  probability NUMERIC(5, 2) DEFAULT 0,
  color       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deals (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title       TEXT NOT NULL,
  amount      NUMERIC(15, 2) DEFAULT 0,
  currency    TEXT DEFAULT 'USD',
  stage       TEXT NOT NULL,
  priority    TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  probability NUMERIC(5, 2) DEFAULT 0,
  close_date  DATE,
  company_id  UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id    UUID REFERENCES public.users(id),
  description TEXT,
  is_won      BOOLEAN,
  closed_at   TIMESTAMPTZ,
  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deal_contacts (
  deal_id    UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  role       TEXT,
  PRIMARY KEY (deal_id, contact_id)
);

CREATE TABLE IF NOT EXISTS public.activities (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('call','email','meeting','note','task','deal_created','deal_updated','contact_created')),
  title        TEXT NOT NULL,
  description  TEXT,
  contact_id   UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id   UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id      UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  user_id      UUID REFERENCES public.users(id),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT,
  due_date         TIMESTAMPTZ,
  priority         TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status           TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','completed','cancelled')),
  task_type        TEXT DEFAULT 'To-do',
  contact_id       UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id          UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  company_id       UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  assigned_to      UUID REFERENCES public.users(id),
  created_by       TEXT,
  reminder_minutes INTEGER,
  reminder_time    TIMESTAMPTZ,
  reminder_sent    BOOLEAN NOT NULL DEFAULT false,
  calendar_event_id TEXT,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meetings (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  location     TEXT,
  meeting_url  TEXT,
  contact_id   UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id      UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  organizer_id UUID REFERENCES public.users(id),
  status       TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tickets (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subject     TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'new' CHECK (status IN ('new','waiting_contact','waiting_us','closed')),
  priority    TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  source      TEXT DEFAULT 'Other',
  owner_name  TEXT,
  contact_id  UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id  UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_templates (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  category   TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tags (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  color      TEXT DEFAULT '#6366F1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_tags (
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id     UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.import_history (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  file_name     TEXT NOT NULL,
  file_size     INTEGER,
  type          TEXT NOT NULL CHECK (type IN ('contacts','companies','deals')),
  total_rows    INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  failed_rows   INTEGER DEFAULT 0,
  errors        JSONB DEFAULT '[]',
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT,
  type       TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  is_read    BOOLEAN DEFAULT FALSE,
  link       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.google_tokens (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_email            TEXT,
  access_token           TEXT,
  refresh_token          TEXT,
  expires_at             TIMESTAMPTZ,
  scope                  TEXT,
  calendar_email         TEXT,
  calendar_access_token  TEXT,
  calendar_refresh_token TEXT,
  calendar_expires_at    TIMESTAMPTZ,
  has_calendar           BOOLEAN DEFAULT FALSE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.synced_emails (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_message_id  TEXT NOT NULL,
  gmail_thread_id   TEXT,
  subject           TEXT,
  from_email        TEXT NOT NULL,
  from_name         TEXT,
  to_email          TEXT,
  body_preview      TEXT,
  received_at       TIMESTAMPTZ,
  is_read           BOOLEAN DEFAULT FALSE,
  sent_by_user      BOOLEAN NOT NULL DEFAULT false,
  last_reply_at     TIMESTAMPTZ,
  follow_up_enabled BOOLEAN NOT NULL DEFAULT false,
  follow_up_days    INTEGER NOT NULL DEFAULT 3,
  follow_up_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  follow_up_sent_at TIMESTAMPTZ,
  contact_id        UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id        UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, gmail_message_id)
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_sync          BOOLEAN NOT NULL DEFAULT true,
  tasks_calendar_sync    BOOLEAN NOT NULL DEFAULT false,
  meeting_scheduling     BOOLEAN NOT NULL DEFAULT false,
  out_of_office          BOOLEAN NOT NULL DEFAULT false,
  availability_calendar  TEXT    NOT NULL DEFAULT '',
  email_tracking         BOOLEAN NOT NULL DEFAULT true,
  log_to_crm             BOOLEAN NOT NULL DEFAULT true,
  auto_log_calls         BOOLEAN NOT NULL DEFAULT true,
  notif_deal_stage       BOOLEAN NOT NULL DEFAULT true,
  notif_new_contact      BOOLEAN NOT NULL DEFAULT true,
  notif_task_due         BOOLEAN NOT NULL DEFAULT true,
  notif_meeting_reminder BOOLEAN NOT NULL DEFAULT true,
  notif_email_open       BOOLEAN NOT NULL DEFAULT false,
  notif_email_click      BOOLEAN NOT NULL DEFAULT false,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_contacts_email        ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id   ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage           ON public.deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_company_id      ON public.deals(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON public.activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id    ON public.activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by      ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id      ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder        ON public.tasks(reminder_time, reminder_sent) WHERE reminder_sent = false AND reminder_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_user_id    ON public.synced_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_contact_id ON public.synced_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_company_id ON public.synced_emails(company_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_received_at ON public.synced_emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_synced_emails_followup   ON public.synced_emails(follow_up_enabled, last_reply_at, follow_up_sent_at, sent_by_user) WHERE follow_up_enabled = true AND follow_up_sent_at IS NULL AND sent_by_user = true;
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON public.google_tokens(user_id);
CREATE INDEX IF NOT EXISTS tickets_created_by_idx    ON public.tickets(created_by);
CREATE INDEX IF NOT EXISTS tickets_status_idx        ON public.tickets(status);
CREATE INDEX IF NOT EXISTS tickets_contact_idx       ON public.tickets(contact_id);
CREATE INDEX IF NOT EXISTS tickets_company_idx       ON public.tickets(company_id);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────

ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_emails  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings  ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- companies
CREATE POLICY "companies_all" ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- contacts
CREATE POLICY "contacts_select" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacts_insert" ON public.contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "contacts_update" ON public.contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "contacts_delete" ON public.contacts FOR DELETE TO authenticated USING (true);

-- deals
CREATE POLICY "deals_all" ON public.deals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- activities
CREATE POLICY "activities_all" ON public.activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- tasks (per-user)
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated USING (created_by = auth.uid()::text);
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid()::text);
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated USING (created_by = auth.uid()::text);
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated USING (created_by = auth.uid()::text);

-- meetings
CREATE POLICY "meetings_all" ON public.meetings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- tickets (per-user)
CREATE POLICY "tickets_select" ON public.tickets FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "tickets_insert" ON public.tickets FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "tickets_update" ON public.tickets FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "tickets_delete" ON public.tickets FOR DELETE TO authenticated USING (created_by = auth.uid());

-- email_templates
CREATE POLICY "email_templates_all" ON public.email_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- notifications
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- import_history
CREATE POLICY "import_history_all" ON public.import_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- google_tokens: service role only (no user policies)

-- synced_emails
CREATE POLICY "synced_emails_select" ON public.synced_emails FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);
CREATE POLICY "synced_emails_insert" ON public.synced_emails FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "synced_emails_update" ON public.synced_emails FOR UPDATE TO authenticated USING (user_id::text = auth.uid()::text);
CREATE POLICY "synced_emails_delete" ON public.synced_emails FOR DELETE TO authenticated USING (user_id::text = auth.uid()::text);

-- user_settings
CREATE POLICY "user_settings_all" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── TRIGGERS ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tickets_updated_at   BEFORE UPDATE ON public.tickets        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tasks_updated_at     BEFORE UPDATE ON public.tasks          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contacts_updated_at  BEFORE UPDATE ON public.contacts       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_deals_updated_at     BEFORE UPDATE ON public.deals          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_settings_updated_at  BEFORE UPDATE ON public.user_settings  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── SEED DATA ─────────────────────────────────────────────────

INSERT INTO public.pipeline_stages (name, order_index, probability, color) VALUES
  ('Intro Call',            1,  5,  '#94A3B8'),
  ('First Email',           2,  10, '#60A5FA'),
  ('Need Analysis Call',    3,  20, '#818CF8'),
  ('Appointment Setting',   4,  30, '#A78BFA'),
  ('Meeting',               5,  40, '#C084FC'),
  ('Follow-up Email',       6,  50, '#E879F9'),
  ('Terms & Conditions',    7,  60, '#FB923C'),
  ('Agreement',             8,  75, '#FBBF24'),
  ('Start Date',            9,  85, '#34D399'),
  ('After-Sales',           10, 90, '#10B981'),
  ('Retention Management',  11, 95, '#059669'),
  ('Referral Management',   12, 98, '#6366F1')
ON CONFLICT DO NOTHING;
