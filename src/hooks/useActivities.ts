'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { isAnonymousUser } from '@/lib/demoUser';

export interface Activity {
  id: string;
  type: 'note' | 'call' | 'task' | 'meeting' | 'email';
  title: string;
  description?: string;
  contact_id?: string;
  company_id?: string;
  created_at: string;
  due_date?: string;
  priority?: string;
  location?: string;
}

function storageKey() {
  const email =
    typeof window !== 'undefined'
      ? localStorage.getItem('crm_demo_user_email') || 'default'
      : 'default';
  return `crm_activities_${email}`;
}

export function useActivities(contactId?: string, companyId?: string) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (isAnonymousUser()) {
      // Demo/anonymous mode — read from localStorage and filter in memory
      try {
        const stored: Activity[] = JSON.parse(localStorage.getItem(storageKey()) || '[]');
        const filtered = stored.filter((a) => {
          if (contactId && companyId) return a.contact_id === contactId || a.company_id === companyId;
          if (contactId) return a.contact_id === contactId;
          if (companyId) return a.company_id === companyId;
          return true;
        });
        setActivities(filtered);
      } catch {
        setActivities([]);
      }
      return;
    }

    // Authenticated mode — query Supabase filtered by contact/company
    const fetchActivities = async () => {
      try {
        let query = supabase
          .from('activities')
          .select('*')
          .order('created_at', { ascending: false });

        if (contactId) {
          query = query.eq('contact_id', contactId);
        } else if (companyId) {
          query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;
        if (error) throw error;
        setActivities(
          (data || []).map((r) => ({
            id: r.id,
            type: r.type,
            title: r.title,
            description: r.description,
            contact_id: r.contact_id,
            company_id: r.company_id,
            created_at: r.created_at,
            due_date: r.due_date,
            location: r.location,
          }))
        );
      } catch {
        setActivities([]);
      }
    };

    fetchActivities();
  // Re-fetch whenever the contact/company changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, companyId]);

  const addActivity = useCallback(
    async (activity: Omit<Activity, 'id' | 'created_at'>) => {
      const newItem: Activity = {
        ...activity,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };

      // Show immediately — optimistic update before any async work
      setActivities((prev) => [newItem, ...prev]);

      if (isAnonymousUser()) {
        // Demo mode — persist to localStorage
        const allStored: Activity[] = JSON.parse(localStorage.getItem(storageKey()) || '[]');
        localStorage.setItem(storageKey(), JSON.stringify([newItem, ...allStored]));
        return newItem;
      }

      // Authenticated mode — persist to Supabase in background
      try {
        const { data: { user } } = await supabase.auth.getUser();

        // Build insert payload with only columns confirmed to exist in the DB
        const payload: Record<string, unknown> = {
          type: activity.type,
          title: activity.title,
          description: activity.description || null,
          contact_id: activity.contact_id || null,
          company_id: activity.company_id || null,
          due_date: activity.due_date || null,
          location: activity.location || null,
        };
        // user_id: only include if it matches a row in public.users — omit to avoid FK errors
        if (user?.id) payload.user_id = user.id;

        let result = await supabase.from('activities').insert(payload).select().single();

        // If insert still failed (e.g. user_id FK), retry without user_id
        if (result.error && user?.id) {
          const { user_id: _u, ...corePayload } = payload;
          result = await supabase.from('activities').insert(corePayload).select().single();
        }

        if (result.error) {
          console.error('[useActivities] Supabase insert error:', result.error.message, result.error.code, result.error.details);
          return newItem; // keep optimistic item as-is
        }

        const data = result.data;
        // Swap optimistic item with the server-confirmed version
        setActivities((prev) =>
          prev.map((a) =>
            a.id === newItem.id
              ? {
                  id: data.id,
                  type: data.type,
                  title: data.title,
                  description: data.description,
                  contact_id: data.contact_id,
                  company_id: data.company_id,
                  created_at: data.created_at,
                  due_date: data.due_date,
                  location: data.location,
                }
              : a
          )
        );
      } catch (err: unknown) {
        const e = err as { message?: string; code?: string };
        console.error('[useActivities] Failed to persist to Supabase:', e?.message || err);
      }

      return newItem;
    },
    []
  );

  return { activities, addActivity };
}
