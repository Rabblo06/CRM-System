import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  const now = new Date();

  // Token still valid
  if (expiresAt && expiresAt > now && data.calendar_access_token) {
    return data.calendar_access_token;
  }

  // Refresh the token
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

  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await supabase
    .from('google_tokens')
    .update({
      calendar_access_token: refreshed.access_token,
      calendar_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return refreshed.access_token;
}

// GET: Fetch events from Google Calendar
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const timeMin = searchParams.get('time_min');
  const timeMax = searchParams.get('time_max');

  if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });

  const accessToken = await getValidToken(userId);
  if (!accessToken) {
    return NextResponse.json({ error: 'No valid calendar token. Please reconnect Google Calendar.' }, { status: 401 });
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
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const errBody = await res.json();
    return NextResponse.json({ error: errBody?.error?.message || 'Failed to fetch events' }, { status: res.status });
  }

  const data = await res.json();

  // Normalize to CalendarEvent shape
  const events = (data.items || []).map((item: {
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    location?: string;
    description?: string;
    attendees?: { email: string }[];
    htmlLink?: string;
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

  return NextResponse.json({ events });
}

// POST: Create a new Google Calendar event
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, title, startDateTime, endDateTime, attendees, location, description, reminderMinutes } = body;

  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
  if (!title || !startDateTime || !endDateTime) {
    return NextResponse.json({ error: 'title, startDateTime, endDateTime are required' }, { status: 400 });
  }

  const accessToken = await getValidToken(user_id);
  if (!accessToken) {
    return NextResponse.json({ error: 'No valid calendar token. Please reconnect Google Calendar.' }, { status: 401 });
  }

  const eventBody: Record<string, unknown> = {
    summary: title,
    start: { dateTime: startDateTime },
    end: { dateTime: endDateTime },
  };
  if (location) eventBody.location = location;
  if (description) eventBody.description = description;
  if (attendees && Array.isArray(attendees) && attendees.length > 0) {
    eventBody.attendees = attendees.map((email: string) => ({ email }));
  }
  if (typeof reminderMinutes === 'number') {
    eventBody.reminders = {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: reminderMinutes },
        { method: 'email', minutes: reminderMinutes },
      ],
    };
  } else {
    eventBody.reminders = { useDefault: true };
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    }
  );

  if (!res.ok) {
    const errBody = await res.json();
    return NextResponse.json({ error: errBody?.error?.message || 'Failed to create event' }, { status: res.status });
  }

  const created = await res.json();
  return NextResponse.json({
    id: created.id,
    title: created.summary,
    start: created.start?.dateTime || created.start?.date,
    end: created.end?.dateTime || created.end?.date,
    htmlLink: created.htmlLink,
  });
}
