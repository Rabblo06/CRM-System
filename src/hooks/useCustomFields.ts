'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { CustomFieldDefinition, CustomFieldValue } from '@/types';

type Module = 'contacts' | 'companies' | 'deals';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function supabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function useCustomFields() {
  async function ensureDefinition(module: Module, name: string): Promise<string> {
    const db = supabase();
    const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const key = slugify(name);

    const { data: existing } = await db
      .from('custom_field_definitions')
      .select('key')
      .eq('user_id', user.id)
      .eq('module', module)
      .eq('key', key)
      .maybeSingle();

    if (existing) return key;

    await db.from('custom_field_definitions').insert({
      user_id: user.id,
      module,
      name,
      key,
      field_type: 'text',
    });

    return key;
  }

  async function saveValue(module: Module, recordId: string, fieldName: string, value: string) {
    const db = supabase();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;

    const key = await ensureDefinition(module, fieldName);

    await db.from('custom_field_values').upsert(
      { user_id: user.id, module, record_id: recordId, field_key: key, value },
      { onConflict: 'record_id,field_key' }
    );
  }

  async function getDefinitions(module: Module): Promise<CustomFieldDefinition[]> {
    const db = supabase();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return [];

    const { data } = await db
      .from('custom_field_definitions')
      .select('*')
      .eq('user_id', user.id)
      .eq('module', module)
      .order('created_at');

    return (data as CustomFieldDefinition[]) || [];
  }

  async function getValues(recordId: string): Promise<CustomFieldValue[]> {
    const db = supabase();
    const { data } = await db
      .from('custom_field_values')
      .select('*')
      .eq('record_id', recordId);

    return (data as CustomFieldValue[]) || [];
  }

  return { ensureDefinition, saveValue, getDefinitions, getValues };
}
