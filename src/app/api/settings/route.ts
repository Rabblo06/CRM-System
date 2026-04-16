import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SETTINGS = {
  // Calendar
  calendar_sync: true,
  tasks_calendar_sync: false,
  meeting_scheduling: false,
  out_of_office: false,
  availability_calendar: '',
  // Email
  email_tracking: true,
  log_to_crm: true,
  // Calling
  auto_log_calls: true,
  // Notifications
  notif_deal_stage: true,
  notif_new_contact: true,
  notif_task_due: true,
  notif_meeting_reminder: true,
  notif_email_open: false,
  notif_email_click: false,
};

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUserId(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const { data: { user }, error } = await adminClient().auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = adminClient();
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[settings GET] Supabase error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return row or defaults if first visit
  const settings = data ? { ...DEFAULT_SETTINGS, ...data } : { ...DEFAULT_SETTINGS, user_id: userId };
  console.log('[settings GET] userId:', userId, 'settings:', settings);
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Whitelist allowed fields
  const allowed = Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[];
  const patch: Record<string, unknown> = { user_id: userId };
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const supabase = adminClient();
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(patch, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('[settings PUT] Supabase error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('[settings PUT] saved:', data);
  return NextResponse.json(data);
}
