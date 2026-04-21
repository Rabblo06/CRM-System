import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiOk, apiErr, apiTooManyRequests, getClientIp, withRoute } from '@/lib/api-error';
import { apiLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const DEFAULT_SETTINGS = {
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

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function getUserId(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await adminClient().auth.getUser(auth.slice(7));
  if (error || !user) return null;
  return user.id;
}

export const GET = withRoute(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rl = apiLimiter.check(ip);
  if (!rl.ok) return apiTooManyRequests(rl.retryAfter);

  const userId = await getUserId(request);
  if (!userId) return apiErr('Unauthorized', 401);

  const supabase = adminClient();
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('settings GET: DB error', { err: error.message });
    return apiErr('Failed to load settings', 500);
  }

  const settings = data
    ? { ...DEFAULT_SETTINGS, ...data }
    : { ...DEFAULT_SETTINGS, user_id: userId };

  logger.info('settings GET', { userId });
  return apiOk(settings);
});

export const PUT = withRoute(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rl = apiLimiter.check(ip);
  if (!rl.ok) return apiTooManyRequests(rl.retryAfter);

  const userId = await getUserId(request);
  if (!userId) return apiErr('Unauthorized', 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return apiErr('Invalid JSON body', 400);
  }

  // Whitelist — only allow known setting keys
  const allowed = Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[];
  const patch: Record<string, unknown> = { user_id: userId };
  for (const key of allowed) {
    if (key in body) patch[key] = (body as Record<string, unknown>)[key];
  }

  const supabase = adminClient();
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(patch, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    logger.error('settings PUT: DB error', { err: error.message });
    return apiErr('Failed to save settings', 500);
  }

  logger.info('settings PUT: saved', { userId });
  return apiOk(data);
});
