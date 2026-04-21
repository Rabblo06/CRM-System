'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { userKey, isAnonymousUser } from '@/lib/demoUser';
import {
  mockContacts,
  mockCompanies,
  mockDeals,
  mockActivities,
  mockTasks,
  mockEmailTemplates,
  mockDashboardMetrics,
  mockRevenueData,
} from '@/lib/mockData';
import type { Contact, Company, Deal, Activity, Task, EmailTemplate } from '@/types';

/* ─────────────────────────────────────────────────────────
   AUTH HELPER
   Returns the current Supabase user ID, or null if not
   authenticated. Used to stamp created_by on every INSERT
   so RLS policies can filter rows per user.
───────────────────────────────────────────────────────── */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────
   LOCAL STORAGE HELPERS  (demo / offline fallback)
   Keys are scoped by the logged-in user's email so each
   demo account has fully isolated data.
───────────────────────────────────────────────────────── */
const CONTACTS_STORAGE_KEY = 'crm_contacts_local';

function loadLocalContacts(): Contact[] | null {
  try {
    const raw = localStorage.getItem(userKey(CONTACTS_STORAGE_KEY));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLocalContacts(contacts: Contact[]) {
  try { localStorage.setItem(userKey(CONTACTS_STORAGE_KEY), JSON.stringify(contacts)); } catch {}
}

/* ═══════════════════════════════════════════════════════
   useContacts
═══════════════════════════════════════════════════════ */
export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      // With RLS enabled, Supabase automatically returns only rows
      // where created_by = auth.uid() — no extra filter needed here.
      const { data, error } = await supabase
        .from('contacts')
        .select('*, company:companies(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIsMockMode(false);
      setContacts(data || []);
    } catch {
      setIsMockMode(true);
      const persisted = loadLocalContacts();
      // Real users start empty; anonymous demo mode gets mock seed data
      const initial = persisted ?? (isAnonymousUser() ? mockContacts : []);
      if (!persisted) saveLocalContacts(initial);
      setContacts(initial);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const createContact = async (contact: Partial<Contact>) => {
    try {
      // Stamp the current user's ID so RLS INSERT policy passes
      const userId = await getCurrentUserId();

      // Ensure user row exists in public.users (FK required by contacts)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch('/api/users/ensure', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }

      const payload = { ...contact, created_by: userId };

      const { data, error } = await supabase
        .from('contacts')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      setContacts((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (err: unknown) {
      // 409 = duplicate email — surface this to the user instead of silently saving locally
      const pgError = err as { code?: string; message?: string };
      if (pgError?.code === '23505') {
        return { data: null, error: 'A contact with this email already exists.' };
      }
      const newContact = {
        ...contact,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        lead_status: contact.lead_status || 'new',
        lifecycle_stage: contact.lifecycle_stage || 'lead',
      } as Contact;
      setContacts((prev) => {
        const next = [newContact, ...prev];
        saveLocalContacts(next);
        return next;
      });
      return { data: newContact, error: null };
    }
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    try {
      // RLS UPDATE policy ensures the row belongs to auth.uid()
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
      return { data, error: null };
    } catch {
      setContacts((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
        if (isMockMode) saveLocalContacts(next);
        return next;
      });
      return { data: null, error: null };
    }
  };

  const deleteContact = async (id: string) => {
    try {
      // RLS DELETE policy ensures only the owner can delete
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    } catch {
      // continue — local state will still be updated below
    }
    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (isMockMode) saveLocalContacts(next);
      return next;
    });
  };

  return { contacts, loading, error, fetchContacts, createContact, updateContact, deleteContact };
}

/* ═══════════════════════════════════════════════════════
   useCompanies
═══════════════════════════════════════════════════════ */
export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCompanies(data || []);
    } catch {
      setCompanies(isAnonymousUser() ? mockCompanies : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const createCompany = async (company: Partial<Company>) => {
    try {
      const userId = await getCurrentUserId();

      // Ensure user row exists in public.users (FK required by companies)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch('/api/users/ensure', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }

      const { data, error } = await supabase
        .from('companies')
        .insert({ ...company, created_by: userId })
        .select()
        .single();
      if (error) throw error;
      setCompanies((prev) => [data, ...prev]);
      return { data, error: null };
    } catch {
      const newCompany = {
        ...company,
        id: `comp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Company;
      setCompanies((prev) => [newCompany, ...prev]);
      return { data: newCompany, error: null };
    }
  };

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
      return { data, error: null };
    } catch {
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
      return { data: null, error: null };
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      await supabase.from('companies').delete().eq('id', id);
    } catch { /* continue */ }
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  };

  return { companies, loading, fetchCompanies, createCompany, updateCompany, deleteCompany };
}

/* ═══════════════════════════════════════════════════════
   useDeals
═══════════════════════════════════════════════════════ */
export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*, company:companies(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDeals(data || []);
    } catch {
      setDeals(isAnonymousUser() ? mockDeals : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const createDeal = async (deal: Partial<Deal>) => {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('deals')
        .insert({ ...deal, created_by: userId })
        .select()
        .single();
      if (error) throw error;
      setDeals((prev) => [data, ...prev]);
      return { data, error: null };
    } catch {
      const newDeal = {
        ...deal,
        id: `deal-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        amount: deal.amount || 0,
        currency: deal.currency || 'USD',
        probability: deal.probability || 0,
        priority: deal.priority || 'medium',
      } as Deal;
      setDeals((prev) => [newDeal, ...prev]);
      return { data: newDeal, error: null };
    }
  };

  const updateDeal = async (id: string, updates: Partial<Deal>) => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
      return { data, error: null };
    } catch {
      setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
      return { data: null, error: null };
    }
  };

  const deleteDeal = async (id: string) => {
    try {
      await supabase.from('deals').delete().eq('id', id);
    } catch { /* continue */ }
    setDeals((prev) => prev.filter((d) => d.id !== id));
  };

  const deleteAllDeals = async () => {
    try {
      const userId = await getCurrentUserId();
      await supabase.from('deals').delete().eq('created_by', userId);
    } catch { /* continue */ }
    setDeals([]);
  };

  return { deals, loading, fetchDeals, createDeal, updateDeal, deleteDeal, deleteAllDeals };
}

/* ═══════════════════════════════════════════════════════
   useActivities
═══════════════════════════════════════════════════════ */
export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*, contact:contacts(first_name, last_name, email), deal:deals(title)')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setActivities(data || []);
      } catch {
        setActivities(isAnonymousUser() ? mockActivities : []);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const createActivity = async (activity: Partial<Activity>) => {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from('activities')
        .insert({ ...activity, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      setActivities((prev) => [data, ...prev]);
      return { data, error: null };
    } catch {
      const newActivity = {
        ...activity,
        id: `act-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_completed: activity.is_completed || false,
      } as Activity;
      setActivities((prev) => [newActivity, ...prev]);
      return { data: newActivity, error: null };
    }
  };

  return { activities, loading, createActivity };
}

/* ═══════════════════════════════════════════════════════
   useTasks
   localStorage is ALWAYS the source of truth.
   Supabase is attempted as background sync only.
   This guarantees tasks NEVER disappear on refresh.
═══════════════════════════════════════════════════════ */
const TASKS_STORAGE_KEY = 'crm_tasks_local';

function loadLocalTasks(): Task[] {
  try {
    const raw = localStorage.getItem(userKey(TASKS_STORAGE_KEY));
    if (raw) {
      const parsed = JSON.parse(raw) as Task[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return isAnonymousUser() ? mockTasks : [];
}

function saveLocalTasks(list: Task[]) {
  try {
    localStorage.setItem(userKey(TASKS_STORAGE_KEY), JSON.stringify(list));
  } catch { /* ignore */ }
}

const TASKS_SELECT = '*, contact:contacts(first_name, last_name, last_contacted_at, company_id, company:companies(name)), company:companies(name), deal:deals(title)';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all tasks for the current user from Supabase
  const fetchFromDB = async (): Promise<Task[] | null> => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASKS_SELECT)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[useTasks] Supabase fetch error:', error.message);
        return null;
      }
      return data ?? [];
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Show cached data immediately so the page isn't blank
      const cached = loadLocalTasks();
      if (cached.length > 0 && !cancelled) setTasks(cached);

      // Fetch live data from Supabase (primary source of truth)
      const dbTasks = await fetchFromDB();
      if (cancelled) return;

      if (dbTasks !== null) {
        // Supabase is the truth — use it (even if empty, so deleted tasks disappear)
        setTasks(dbTasks);
        saveLocalTasks(dbTasks);
      }
      // If Supabase failed (null), keep showing cached data
      setLoading(false);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTask = async (task: Partial<Task> & { reminder_minutes?: number | null }) => {
    // Optimistic: add to UI immediately with a temp id
    const tempId = `task-${Date.now()}`;
    const optimistic: Task = {
      id: tempId,
      title: task.title || '',
      description: task.description,
      due_date: task.due_date,
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      task_type: task.task_type || 'To-do',
      contact_id: task.contact_id,
      company_id: task.company_id,
      deal_id: task.deal_id,
      assigned_to: task.assigned_to,
      reminder_minutes: task.reminder_minutes ?? null,
      reminder_time: null,
      reminder_sent: false,
      calendar_event_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTasks(prev => { const next = [optimistic, ...prev]; saveLocalTasks(next); return next; });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // Use the API route (handles Google Calendar + reminder_time)
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(task),
        });
        if (res.ok) {
          const serverTask = await res.json();
          // Replace optimistic entry with real server record
          setTasks(prev => {
            const next = prev.map(t => t.id === tempId ? serverTask : t);
            saveLocalTasks(next);
            return next;
          });
          return { data: serverTask, error: null };
        }
      } else {
        // No session: insert directly
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
          .from('tasks')
          .insert({ ...task, created_by: userId ?? null })
          .select(TASKS_SELECT)
          .single();
        if (!error && data) {
          setTasks(prev => {
            const next = prev.map(t => t.id === tempId ? data : t);
            saveLocalTasks(next);
            return next;
          });
          return { data, error: null };
        }
      }
    } catch { /* optimistic version stays */ }

    return { data: optimistic, error: null };
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const merged = { ...updates, updated_at: new Date().toISOString() };
    // Optimistic update
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...merged } : t);
      saveLocalTasks(next);
      return next;
    });
    // Persist to Supabase
    try {
      await supabase.from('tasks').update(merged).eq('id', id);
    } catch { /* optimistic stays */ }
  };

  const deleteTask = async (id: string) => {
    // Optimistic delete
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id);
      saveLocalTasks(next);
      return next;
    });
    try {
      await supabase.from('tasks').delete().eq('id', id);
    } catch { /* optimistic stays */ }
  };

  // Expose a manual refresh so pages can pull latest from DB on demand
  const refreshTasks = async () => {
    const dbTasks = await fetchFromDB();
    if (dbTasks !== null) {
      setTasks(dbTasks);
      saveLocalTasks(dbTasks);
    }
  };

  return { tasks, loading, createTask, updateTask, deleteTask, refreshTasks };
}

/* ═══════════════════════════════════════════════════════
   useEmailTemplates
   localStorage is ALWAYS the source of truth.
   Supabase is attempted as a background sync only.
   This guarantees templates NEVER disappear on refresh.
═══════════════════════════════════════════════════════ */
const EMAIL_TEMPLATES_KEY = 'crm_email_templates_local';

function loadLocalTemplates(): EmailTemplate[] {
  try {
    const raw = localStorage.getItem(userKey(EMAIL_TEMPLATES_KEY));
    if (raw) {
      const parsed = JSON.parse(raw) as EmailTemplate[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return isAnonymousUser() ? mockEmailTemplates : [];
}

function saveLocalTemplates(list: EmailTemplate[]) {
  try {
    localStorage.setItem(userKey(EMAIL_TEMPLATES_KEY), JSON.stringify(list));
  } catch { /* ignore */ }
}

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Show localStorage data immediately — never blank on refresh
    const local = loadLocalTemplates();
    setTemplates(local);

    // 2. Try Supabase in the background to sync
    const syncFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('email_templates')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          // Supabase has data — use it and update local cache
          setTemplates(data);
          saveLocalTemplates(data);
        }
        // If Supabase returns empty or errors, keep using localStorage (do nothing)
      } catch { /* keep localStorage data */ } finally {
        setLoading(false);
      }
    };
    syncFromSupabase();
  }, []);

  const createTemplate = async (template: Partial<EmailTemplate>) => {
    const newTemplate: EmailTemplate = {
      id: `templ-${Date.now()}`,
      name: template.name || '',
      subject: template.subject || '',
      body: template.body || '',
      category: template.category,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Always save locally first — guaranteed to work
    setTemplates((prev) => {
      const next = [newTemplate, ...prev];
      saveLocalTemplates(next);
      return next;
    });

    // Try Supabase in background — pass null for created_by to avoid FK issues
    try {
      const userId = await getCurrentUserId();
      const { data } = await supabase
        .from('email_templates')
        .insert({
          id: newTemplate.id,
          name: newTemplate.name,
          subject: newTemplate.subject,
          body: newTemplate.body,
          category: newTemplate.category ?? null,
          is_active: true,
          created_by: userId ?? null,
        })
        .select()
        .single();
      // If Supabase insert succeeded, use the DB record (has server timestamps)
      if (data) {
        setTemplates((prev) => {
          const next = prev.map((t) => t.id === newTemplate.id ? data : t);
          saveLocalTemplates(next);
          return next;
        });
        return { data, error: null };
      }
    } catch { /* Supabase failed — localStorage version is already saved */ }

    return { data: newTemplate, error: null };
  };

  const updateTemplate = async (id: string, updates: Partial<EmailTemplate>) => {
    const merged = { ...updates, updated_at: new Date().toISOString() };

    // Always update locally first
    setTemplates((prev) => {
      const next = prev.map((t) => t.id === id ? { ...t, ...merged } : t);
      saveLocalTemplates(next);
      return next;
    });

    // Try Supabase in background
    try {
      await supabase
        .from('email_templates')
        .update(merged)
        .eq('id', id);
    } catch { /* ignore */ }
  };

  const deleteTemplate = async (id: string) => {
    // Always delete locally first
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveLocalTemplates(next);
      return next;
    });

    // Try Supabase in background
    try {
      await supabase.from('email_templates').delete().eq('id', id);
    } catch { /* ignore */ }
  };

  return { templates, loading, createTemplate, updateTemplate, deleteTemplate };
}

/* ═══════════════════════════════════════════════════════
   useDashboard
═══════════════════════════════════════════════════════ */
export function useDashboard() {
  const [metrics, setMetrics] = useState(mockDashboardMetrics);
  const [revenueData, setRevenueData] = useState(mockRevenueData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        // With RLS these counts are automatically scoped to the current user
        const [contactsRes, companiesRes, dealsRes] = await Promise.all([
          supabase.from('contacts').select('count', { count: 'exact' }),
          supabase.from('companies').select('count', { count: 'exact' }),
          supabase.from('deals').select('amount, is_won'),
        ]);

        if (contactsRes.error || companiesRes.error || dealsRes.error) {
          throw new Error('Supabase error');
        }

        const deals = dealsRes.data || [];
        const activeDeals = deals.filter((d) => d.is_won === null || d.is_won === undefined);
        const pipelineRevenue = activeDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
        const closedDeals = deals.filter((d) => d.is_won !== null);
        const wonDeals = closedDeals.filter((d) => d.is_won === true);
        const winRate = closedDeals.length > 0 ? Math.round((wonDeals.length / closedDeals.length) * 100) : 0;

        setMetrics({
          totalContacts: contactsRes.count || 0,
          totalCompanies: companiesRes.count || 0,
          activeDeals: activeDeals.length,
          pipelineRevenue,
          winRate,
          monthlyGrowth: 12,
        });
      } catch {
        setMetrics(mockDashboardMetrics);
        setRevenueData(mockRevenueData);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return { metrics, revenueData, loading };
}
