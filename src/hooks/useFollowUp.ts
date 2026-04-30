'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export interface FollowUpNotification {
  id: string;
  taskId: string;
  subject: string;
  contactId: string | null;
  createdAt: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  cc?: string;
  bcc?: string;
  contactId?: string | null;
  followUpEnabled?: boolean;
  followUpDays?: number;
}

const POLL_MS = 60_000;

export function useFollowUp() {
  const [notifications, setNotifications] = useState<FollowUpNotification[]>([]);
  const [latest, setLatest] = useState<FollowUpNotification | null>(null);
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/followup/check');
      if (!res.ok) return;
      const data = await res.json();
      const newTasks: { taskId: string; subject: string; contactId: string | null }[] = data.tasks || [];

      if (newTasks.length > 0) {
        const notifs: FollowUpNotification[] = newTasks.map(t => ({
          id: crypto.randomUUID(),
          taskId: t.taskId,
          subject: t.subject,
          contactId: t.contactId,
          createdAt: new Date().toISOString(),
        }));
        setNotifications(prev => [...notifs, ...prev]);
        setLatest(notifs[0]);

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          newTasks.forEach(t => {
            new Notification('Follow-up Reminder', {
              body: `No reply to "${t.subject}". A follow-up task has been created.`,
              icon: '/favicon.ico',
            });
          });
        }
      }
    } catch (err) {
      console.error('[useFollowUp] Poll error:', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    poll();
    timerRef.current = setInterval(poll, POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [poll]);

  const sendEmailWithFollowUp = useCallback(async (
    opts: SendEmailOptions,
  ): Promise<{ success: boolean; error?: string }> => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      // Check which email provider is connected by querying Supabase token tables.
      // Prefer Outlook if connected; fall back to Gmail.
      const { data: outlookToken } = await supabase
        .from('outlook_tokens')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (outlookToken) {
        // ── Outlook send ─────────────────────────────────────
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return { success: false, error: 'Session expired. Please log in again.' };

        const res = await fetch('/api/outlook/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            to: opts.to,
            cc: opts.cc,
            bcc: opts.bcc,
            subject: opts.subject,
            html: opts.html,
            contact_id: opts.contactId ?? null,
          }),
        });

        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error || 'Failed to send via Outlook' };
        return { success: true };

      } else {
        // ── Gmail send ───────────────────────────────────────
        const res = await fetch('/api/gmail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            to: opts.to,
            cc: opts.cc,
            bcc: opts.bcc,
            subject: opts.subject,
            html: opts.html,
            contact_id: opts.contactId ?? null,
            follow_up_enabled: opts.followUpEnabled ?? false,
            follow_up_days: opts.followUpDays ?? 3,
          }),
        });

        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error };
        return { success: true };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useFollowUp] Send error:', msg);
      return { success: false, error: msg };
    } finally {
      setSending(false);
    }
  }, []);

  return {
    notifications,
    latest,
    sending,
    dismissLatest: () => setLatest(null),
    clearAll: () => setNotifications([]),
    sendEmailWithFollowUp,
  };
}
