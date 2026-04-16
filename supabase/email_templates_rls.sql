-- Fix: email_templates had RLS enabled but no policies (blocked all access).
-- Run this in Supabase Dashboard → SQL Editor.

CREATE POLICY "Authenticated users can manage email_templates"
  ON public.email_templates
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
