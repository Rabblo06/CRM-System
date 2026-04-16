'use client';

/**
 * useFollowUp
 *
 * Polls /api/followup/check every 60 seconds.
 * When new follow-up tasks are auto-created, shows an in-app notification.
 *
 * Also exports sendEmailWithFollowUp() — a wrapper around /api/gmail/send
 * that includes the follow-up configuration.
 */
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
        console.log('[useFollowUp] Auto-created follow-up tasks:', newTasks);
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

  const sendEmailWithFollowUp = useCallback(async (opts: SendEmailOptions): Promise<{ success: boolean; error?: string }> => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      console.log('[useFollowUp] Sending email with follow-up:', {
        to: opts.to,
        subject: opts.subject,
        followUpEnabled: opts.followUpEnabled,
        followUpDays: opts.followUpDays,
      });

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

      console.log('[useFollowUp] Email sent. messageId:', data.messageId);
      return { success: true };
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
