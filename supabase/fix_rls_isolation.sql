-- ============================================================
-- Fix RLS: enforce per-user data isolation on all tables
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── CONTACTS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can delete contacts" ON public.contacts;

CREATE POLICY "contacts_select" ON public.contacts FOR SELECT TO authenticated USING (created_by::text = auth.uid()::text);
CREATE POLICY "contacts_insert" ON public.contacts FOR INSERT TO authenticated WITH CHECK (created_by::text = auth.uid()::text);
CREATE POLICY "contacts_update" ON public.contacts FOR UPDATE TO authenticated USING (created_by::text = auth.uid()::text);
CREATE POLICY "contacts_delete" ON public.contacts FOR DELETE TO authenticated USING (created_by::text = auth.uid()::text);

-- ── COMPANIES ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "companies_all" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can view all companies" ON public.companies;

CREATE POLICY "companies_select" ON public.companies FOR SELECT TO authenticated USING (created_by::text = auth.uid()::text);
CREATE POLICY "companies_insert" ON public.companies FOR INSERT TO authenticated WITH CHECK (created_by::text = auth.uid()::text);
CREATE POLICY "companies_update" ON public.companies FOR UPDATE TO authenticated USING (created_by::text = auth.uid()::text);
CREATE POLICY "companies_delete" ON public.companies FOR DELETE TO authenticated USING (created_by::text = auth.uid()::text);

-- ── DEALS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "deals_all" ON public.deals;
DROP POLICY IF EXISTS "Authenticated users can manage deals" ON public.deals;

CREATE POLICY "deals_select" ON public.deals FOR SELECT TO authenticated USING (created_by::text = auth.uid()::text);
CREATE POLICY "deals_insert" ON public.deals FOR INSERT TO authenticated WITH CHECK (created_by::text = auth.uid()::text);
CREATE POLICY "deals_update" ON public.deals FOR UPDATE TO authenticated USING (created_by::text = auth.uid()::text);
CREATE POLICY "deals_delete" ON public.deals FOR DELETE TO authenticated USING (created_by::text = auth.uid()::text);

-- ── ACTIVITIES ────────────────────────────────────────────────
DROP POLICY IF EXISTS "activities_all" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can manage activities" ON public.activities;

CREATE POLICY "activities_select" ON public.activities FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);
CREATE POLICY "activities_insert" ON public.activities FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "activities_update" ON public.activities FOR UPDATE TO authenticated USING (user_id::text = auth.uid()::text);
CREATE POLICY "activities_delete" ON public.activities FOR DELETE TO authenticated USING (user_id::text = auth.uid()::text);

-- ── MEETINGS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "meetings_all" ON public.meetings;

CREATE POLICY "meetings_select" ON public.meetings FOR SELECT TO authenticated USING (organizer_id::text = auth.uid()::text);
CREATE POLICY "meetings_insert" ON public.meetings FOR INSERT TO authenticated WITH CHECK (organizer_id::text = auth.uid()::text);
CREATE POLICY "meetings_update" ON public.meetings FOR UPDATE TO authenticated USING (organizer_id::text = auth.uid()::text);
CREATE POLICY "meetings_delete" ON public.meetings FOR DELETE TO authenticated USING (organizer_id::text = auth.uid()::text);

-- ── EMAIL TEMPLATES ───────────────────────────────────────────
DROP POLICY IF EXISTS "email_templates_all" ON public.email_templates;

CREATE POLICY "email_templates_select" ON public.email_templates FOR SELECT TO authenticated USING (created_by::text = auth.uid()::text);
CREATE POLICY "email_templates_insert" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (created_by::text = auth.uid()::text);
CREATE POLICY "email_templates_update" ON public.email_templates FOR UPDATE TO authenticated USING (created_by::text = auth.uid()::text);
CREATE POLICY "email_templates_delete" ON public.email_templates FOR DELETE TO authenticated USING (created_by::text = auth.uid()::text);

-- ── IMPORT HISTORY ────────────────────────────────────────────
DROP POLICY IF EXISTS "import_history_all" ON public.import_history;

CREATE POLICY "import_history_select" ON public.import_history FOR SELECT TO authenticated USING (created_by::text = auth.uid()::text);
CREATE POLICY "import_history_insert" ON public.import_history FOR INSERT TO authenticated WITH CHECK (created_by::text = auth.uid()::text);
