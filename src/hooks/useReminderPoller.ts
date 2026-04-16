'use client';

/**
 * useReminderPoller
 *
 * Polls /api/tasks/reminders every 60 seconds while the page is open.
 * When a reminder fires, shows an in-app toast notification.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export interface ReminderNotification {
  id: string;
  taskId: string;
  title: string;
  triggeredAt: string;
}

const POLL_INTERVAL_MS = 60_000; // 1 minute

export function useReminderPoller() {
  const [notifications, setNotifications] = useState<ReminderNotification[]>([]);
  const [latestReminder, setLatestReminder] = useState<ReminderNotification | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks/reminders');
      if (!res.ok) return;

      const data = await res.json();
      const fired: { id: string; title: string }[] = data.tasks || [];

      if (fired.length > 0) {
        console.log('[useReminderPoller] Reminders triggered:', fired);

        const newNotifs: ReminderNotification[] = fired.map(t => ({
          id: crypto.randomUUID(),
          taskId: t.id,
          title: t.title,
          triggeredAt: new Date().toISOString(),
        }));

        setNotifications(prev => [...newNotifs, ...prev]);
        setLatestReminder(newNotifs[0]);

        // Show browser notification if permission granted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          fired.forEach(t => {
            new Notification('Task Reminder', {
              body: t.title,
              icon: '/favicon.ico',
            });
          });
        }
      }
    } catch (err) {
      console.error('[useReminderPoller] Poll error:', err);
    }
  }, []);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Start polling
  useEffect(() => {
    // Run immediately on mount, then every 60s
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  const dismissLatest = useCallback(() => setLatestReminder(null), []);
  const clearAll = useCallback(() => setNotifications([]), []);

  return { notifications, latestReminder, dismissLatest, clearAll };
}
