'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  location?: string;
  description?: string;
  attendees?: string[];
  htmlLink?: string;
}

export function useCalendar() {
  const [isConnected, setIsConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    // If returning from calendar OAuth, force a re-check
    const justConnected = localStorage.getItem('calendar_just_connected');
    if (justConnected) {
      localStorage.removeItem('calendar_just_connected');
    }
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('google_tokens')
        .select('has_calendar, calendar_email')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsConnected(!!data?.has_calendar);
      setCalendarEmail(data?.calendar_email || '');
    } catch {
      // silently ignore
    }
    setLoading(false);
  };

  const connectCalendar = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Store current path so we can return after OAuth
    localStorage.setItem('calendar_oauth_return', '/meetings');
    window.location.href = `/api/calendar/auth?user_id=${user.id}`;
  };

  const disconnectCalendar = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('google_tokens').update({
      has_calendar: false,
      calendar_email: null,
      calendar_access_token: null,
      calendar_refresh_token: null,
    }).eq('user_id', user.id);
    setIsConnected(false);
    setCalendarEmail('');
    setEvents([]);
  };

  const fetchEvents = useCallback(async (timeMin?: string, timeMax?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const params = new URLSearchParams({ user_id: user.id });
    if (timeMin) params.set('time_min', timeMin);
    if (timeMax) params.set('time_max', timeMax);
    const res = await fetch(`/api/calendar/events?${params}`);
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events || []);
    }
  }, []);

  const createEvent = useCallback(async (eventData: {
    title: string;
    startDateTime: string;
    endDateTime: string;
    attendees?: string[];
    location?: string;
    description?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, ...eventData }),
    });
    if (!res.ok) return null;
    return await res.json();
  }, []);

  return { isConnected, calendarEmail, loading, events, connectCalendar, disconnectCalendar, fetchEvents, createEvent };
}
