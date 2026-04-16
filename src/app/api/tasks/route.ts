import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUserId(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await adminClient().auth.getUser(auth.slice(7));
  if (error || !user) return null;
  return user.id;
}

async function getValidCalendarToken(userId: string): Promise<string | null> {
  const supabase = adminClient();
  const { data } = await supabase
    .from('google_tokens')
    .select('calendar_access_token, calendar_refresh_token, calendar_expires_at, has_calendar')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.has_calendar || !data.calendar_access_token) return null;

  const expiresAt = data.calendar_expires_at ? new Date(data.calendar_expires_at) : null;
  if (expiresAt && expiresAt > new Date()) return data.calendar_access_token;

  // Refresh token
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
  }).eq('user_id', userId);

  return refreshed.access_token;
}

// POST /api/tasks — create task + Google Calendar event + schedule reminder
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { title, description, due_date, priority, status, reminder_minutes, contact_id, deal_id, task_type, company_id } = body;

  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  console.log('[tasks POST] Creating task:', { title, due_date, reminder_minutes });

  // Calculate reminder_time in UTC
  let reminder_time: string | null = null;
  if (due_date && typeof reminder_minutes === 'number' && reminder_minutes >= 0) {
    const dueUTC = new Date(due_date);
    reminder_time = new Date(dueUTC.getTime() - reminder_minutes * 60 * 1000).toISOString();
    console.log('[tasks POST] reminder_time:', reminder_time, '(', reminder_minutes, 'min before', dueUTC.toISOString(), ')');
  }

  const supabase = adminClient();

  // Insert task into DB
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      title,
      description: description || null,
      due_date: due_date ? new Date(due_date).toISOString() : null,
      priority: priority || 'medium',
      status: status || 'todo',
      task_type: task_type || 'To-do',
      reminder_minutes: reminder_minutes ?? null,
      reminder_time,
      reminder_sent: false,
      contact_id: contact_id || null,
      company_id: company_id || null,
      deal_id: deal_id || null,
      created_by: userId,
    })
    .select()
    .single();

  if (taskError) {
    console.error('[tasks POST] DB error:', taskError.message);
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }

  console.log('[tasks POST] Task created in DB:', task.id);

  // Create Google Calendar event if calendar is connected and task has a due date
  let calendar_event_id: string | null = null;
  if (due_date) {
    try {
      const accessToken = await getValidCalendarToken(userId);
      if (accessToken) {
        const startISO = new Date(due_date).toISOString();
        // Default event duration: 30 minutes
        const endISO = new Date(new Date(due_date).getTime() + 30 * 60 * 1000).toISOString();

        const eventBody: Record<string, unknown> = {
          summary: `[Task] ${title}`,
          description: description || `CRM Task: ${title}`,
          start: { dateTime: startISO },
          end: { dateTime: endISO },
        };

        if (typeof reminder_minutes === 'number' && reminder_minutes >= 0) {
          eventBody.reminders = {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: reminder_minutes },
              { method: 'email', minutes: reminder_minutes },
            ],
          };
        } else {
          eventBody.reminders = { useDefault: true };
        }

        const calRes = await fetch(
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

        if (calRes.ok) {
          const calEvent = await calRes.json();
          calendar_event_id = calEvent.id;
          console.log('[tasks POST] Google Calendar event created:', calendar_event_id);

          // Save calendar_event_id back to the task
          await supabase
            .from('tasks')
            .update({ calendar_event_id })
            .eq('id', task.id);
        } else {
          const errBody = await calRes.json();
          console.warn('[tasks POST] Calendar event failed:', errBody?.error?.message);
        }
      } else {
        console.log('[tasks POST] No calendar token — skipping Google Calendar sync');
      }
    } catch (calErr) {
      console.error('[tasks POST] Calendar error (non-fatal):', calErr);
    }
  }

  return NextResponse.json({ ...task, calendar_event_id });
}
