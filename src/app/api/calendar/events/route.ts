import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiOk, apiErr, apiTooManyRequests, getClientIp, getServerUserId, withRoute } from '@/lib/api-error';
import { apiLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function getValidToken(userId: string): Promise<string | null> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from('google_tokens')
    .select('calendar_access_token, calendar_refresh_token, calendar_expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = data.calendar_expires_at ? new Date(data.calendar_expires_at) : null;
  if (expiresAt && expiresAt > new Date() && data.calendar_access_token) {
    return data.calendar_access_token;
  }

  if (!data.calendar_refresh_token) return null;

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.calendar_refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const refreshed = await refreshRes.json();
  if (refreshed.error || !refreshed.access_token) return null;

  await supabase.from('google_tokens').update({
    calendar_access_token: refreshed.access_token,
    calendar_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  return refreshed.access_token;
}

// GET: Fetch events from Google Calendar
export const GET = withRoute(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rl = apiLimiter.check(ip);
  if (!rl.ok) return apiTooManyRequests(rl.retryAfter);

  const userId = await getServerUserId(request);
  if (!userId) return apiErr('Unauthorized', 401);

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get('time_min');
  const timeMax = searchParams.get('time_max');

  const accessToken = await getValidToken(userId);
  if (!accessToken) {
    return apiErr('No valid calendar token. Please reconnect Google Calendar.', 401);
  }

  const params = new URLSearchParams({
    maxResults: '100',
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  if (timeMin) params.set('timeMin', timeMin);
  if (timeMax) params.set('timeMax', timeMax);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const errBody = await res.json();
    logger.error('calendar/events GET: Google API error', { status: res.status, msg: errBody?.error?.message });
    return apiErr('Failed to fetch calendar events', res.status);
  }

  const data = await res.json();
  const events = (data.items || []).map((item: {
    id: string; summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    location?: string; description?: string;
    attendees?: { email: string }[]; htmlLink?: string;
  }) => ({
    id: item.id,
    title: item.summary || '(No title)',
    start: item.start?.dateTime || item.start?.date || '',
    end: item.end?.dateTime || item.end?.date || '',
    location: item.location,
    description: item.description,
    attendees: (item.attendees || []).map((a: { email: string }) => a.email),
    htmlLink: item.htmlLink,
  }));

  logger.info('calendar/events GET', { userId, count: events.length });
  return apiOk({ events });
});

// POST: Create a new Google Calendar event
export const POST = withRoute(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rl = apiLimiter.check(ip);
  if (!rl.ok) return apiTooManyRequests(rl.retryAfter);

  const userId = await getServerUserId(request);
  if (!userId) return apiErr('Unauthorized', 401);

  const body = await request.json().catch(() => null);
  if (!body) return apiErr('Invalid request body', 400);

  const { title, startDateTime, endDateTime, attendees, location, description, reminderMinutes } = body;

  if (!title || !startDateTime || !endDateTime) {
    return apiErr('title, startDateTime, and endDateTime are required', 400);
  }

  const accessToken = await getValidToken(userId);
  if (!accessToken) {
    return apiErr('No valid calendar token. Please reconnect Google Calendar.', 401);
  }

  const eventBody: Record<string, unknown> = {
    summary: title,
    start: { dateTime: startDateTime },
    end: { dateTime: endDateTime },
    ...(location ? { location } : {}),
    ...(description ? { description } : {}),
    ...(attendees?.length ? { attendees: attendees.map((email: string) => ({ email })) } : {}),
    reminders: typeof reminderMinutes === 'number'
      ? { useDefault: false, overrides: [
          { method: 'popup', minutes: reminderMinutes },
          { method: 'email', minutes: reminderMinutes },
        ]}
      : { useDefault: true },
  };

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    },
  );

  if (!res.ok) {
    const errBody = await res.json();
    logger.error('calendar/events POST: Google API error', { status: res.status, msg: errBody?.error?.message });
    return apiErr('Failed to create calendar event', res.status);
  }

  const created = await res.json();
  logger.info('calendar/events POST: created', { eventId: created.id, userId });
  return apiOk({
    id: created.id,
    title: created.summary,
    start: created.start?.dateTime || created.start?.date,
    end: created.end?.dateTime || created.end?.date,
    htmlLink: created.htmlLink,
  });
});
