'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserSettings {
  // Calendar
  calendar_sync: boolean;
  tasks_calendar_sync: boolean;
  meeting_scheduling: boolean;
  out_of_office: boolean;
  availability_calendar: string;
  // Email
  email_tracking: boolean;
  log_to_crm: boolean;
  // Calling
  auto_log_calls: boolean;
  // Notifications
  notif_deal_stage: boolean;
  notif_new_contact: boolean;
  notif_task_due: boolean;
  notif_meeting_reminder: boolean;
  notif_email_open: boolean;
  notif_email_click: boolean;
}

export const SETTING_DEFAULTS: UserSettings = {
  calendar_sync: true,
  tasks_calendar_sync: false,
  meeting_scheduling: false,
  out_of_office: false,
  availability_calendar: '',
  email_tracking: true,
  log_to_crm: true,
  auto_log_calls: true,
  notif_deal_stage: true,
  notif_new_contact: true,
  notif_task_due: true,
  notif_meeting_reminder: true,
  notif_email_open: false,
  notif_email_click: false,
};

const LS_KEY = 'crm_user_settings_v1';

function loadFromLocalStorage(): UserSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...SETTING_DEFAULTS, ...JSON.parse(raw) } : { ...SETTING_DEFAULTS };
  } catch {
    return { ...SETTING_DEFAULTS };
  }
}

function saveToLocalStorage(s: UserSettings) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

async function getToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>({ ...SETTING_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<'saved' | 'error' | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAuthed = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const token = await getToken();

        if (!token) {
          console.log('[settings] no session → localStorage');
          if (!cancelled) {
            setSettings(loadFromLocalStorage());
            setLoading(false);
          }
          return;
        }

        isAuthed.current = true;
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('[settings] loaded from DB:', data);
        if (!cancelled) setSettings({ ...SETTING_DEFAULTS, ...data });
      } catch (err) {
        console.error('[settings] load error, falling back to localStorage:', err);
        if (!cancelled) setSettings(loadFromLocalStorage());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const showToast = useCallback((type: 'saved' | 'error') => {
    setToast(type);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const updateSetting = useCallback(async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    // 1. Update UI + localStorage immediately (optimistic)
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      saveToLocalStorage(next);
      return next;
    });

    // 2. Try to persist to DB if authenticated
    try {
      const token = await getToken();
      if (!token) {
        showToast('saved'); // localStorage-only, still persists
        return;
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log('[settings] saved to DB:', key, '=', value);
      showToast('saved');
    } catch (err) {
      console.error('[settings] save error:', err);
      // localStorage already updated so it still persists locally
      showToast('error');
    }
  }, [showToast]);

  return { settings, loading, toast, updateSetting };
}
