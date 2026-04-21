'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface NotificationBadges {
  inbox: number;
  tasks: number;
  meetings: number;
}

function showBrowserNotif(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

export function useNotificationBadges() {
  const [badges, setBadges] = useState<NotificationBadges>({ inbox: 0, tasks: 0, meetings: 0 });
  const notifiedMeetingIds = useRef<Set<string>>(new Set());
  const meetingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const requestPermission = useCallback(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchBadges = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Unread emails
      const { count: unreadEmails } = await supabase
        .from('synced_emails')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      // Overdue or due-today tasks
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const { count: dueTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('is_done', false)
        .lte('due_date', todayEnd.toISOString());

      // Today's meetings (activities with type='meeting' due today)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayMeetings } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'meeting')
        .gte('due_date', todayStart.toISOString())
        .lte('due_date', todayEnd.toISOString());

      setBadges({
        inbox:    unreadEmails  ?? 0,
        tasks:    dueTasks      ?? 0,
        meetings: todayMeetings ?? 0,
      });
    } catch {
      // silently ignore
    }
  }, []);

  // Poll for upcoming meetings every 60s and fire browser notification 15 min before
  const pollMeetingReminders = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const in15 = new Date(now.getTime() + 15 * 60 * 1000);

      const { data: upcoming } = await supabase
        .from('activities')
        .select('id, title, due_date')
        .eq('user_id', user.id)
        .eq('type', 'meeting')
        .gte('due_date', now.toISOString())
        .lte('due_date', in15.toISOString());

      for (const meeting of upcoming ?? []) {
        if (notifiedMeetingIds.current.has(meeting.id)) continue;
        notifiedMeetingIds.current.add(meeting.id);

        const startTime = new Date(meeting.due_date).toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit',
        });
        showBrowserNotif('Upcoming Meeting', `"${meeting.title}" starts at ${startTime}`);
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    requestPermission();
    fetchBadges();

    // Poll meeting reminders every 60s
    meetingPollRef.current = setInterval(() => {
      pollMeetingReminders();
    }, 60_000);
    pollMeetingReminders();

    return () => {
      if (meetingPollRef.current) clearInterval(meetingPollRef.current);
    };
  }, [fetchBadges, pollMeetingReminders, requestPermission]);

  // Supabase Realtime: new email → browser notification + increment badge
  useEffect(() => {
    let userId = '';

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      userId = user.id;

      const channel = supabase
        .channel('inbox-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'synced_emails',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const email = payload.new as { subject?: string; from_name?: string; from_email?: string };
            const sender = email.from_name || email.from_email || 'Someone';
            const subject = email.subject || '(no subject)';
            showBrowserNotif(`New email from ${sender}`, subject);
            setBadges(prev => ({ ...prev, inbox: prev.inbox + 1 }));
          },
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, []);

  // Refresh badge counts when window regains focus
  useEffect(() => {
    const onFocus = () => fetchBadges();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchBadges]);

  const markInboxRead = useCallback(() => {
    setBadges(prev => ({ ...prev, inbox: 0 }));
  }, []);

  const markTasksRead = useCallback(() => {
    setBadges(prev => ({ ...prev, tasks: 0 }));
  }, []);

  const markMeetingsRead = useCallback(() => {
    setBadges(prev => ({ ...prev, meetings: 0 }));
  }, []);

  return { badges, markInboxRead, markTasksRead, markMeetingsRead, refetch: fetchBadges };
}
