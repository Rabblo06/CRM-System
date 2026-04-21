/**
 * GET /api/tasks/reminders
 *
 * Background cron job — checks for due reminders and fires them.
 * Protected by CRON_SECRET query param for external callers.
 * Client polling (same origin) is allowed without the secret.
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiOk, apiErr, apiTooManyRequests, getClientIp } from '@/lib/api-error';
import { cronLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface DueTask {
  id: string;
  title: string;
  due_date: string | null;
  reminder_minutes: number | null;
  reminder_time: string | null;
  created_by: string | null;
}

export async function GET(request: NextRequest) {
  // Rate-limit cron polling
  const ip = getClientIp(request);
  const rl = cronLimiter.check(ip);
  if (!rl.ok) return apiTooManyRequests(rl.retryAfter);

  // Secret guard for external cron callers
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    const origin = request.headers.get('origin') || '';
    const host = request.headers.get('host') || '';
    const isInternal = !origin || origin.includes(host);
    if (!isInternal) {
      logger.warn('reminders: unauthorized cron request', { origin });
      return apiErr('Forbidden', 403);
    }
  }

  const supabase = adminClient();
  const now = new Date().toISOString();

  logger.info('reminders: checking due reminders', { at: now });

  const { data: dueTasks, error } = await supabase
    .from('tasks')
    .select('id, title, due_date, reminder_minutes, reminder_time, created_by')
    .lte('reminder_time', now)
    .eq('reminder_sent', false)
    .not('reminder_time', 'is', null);

  if (error) {
    logger.error('reminders: DB query failed', { err: error.message });
    return apiErr('Failed to query reminders', 500);
  }

  const tasks = dueTasks ?? [];
  logger.info('reminders: found due tasks', { count: tasks.length });

  if (tasks.length === 0) {
    return apiOk({ triggered: 0, tasks: [] });
  }

  const triggered: { id: string; title: string }[] = [];

  for (const task of tasks as DueTask[]) {
    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ reminder_sent: true })
        .eq('id', task.id);

      if (updateError) {
        logger.error('reminders: failed to mark sent', { taskId: task.id, err: updateError.message });
        continue;
      }

      logger.info('reminders: triggered', { taskId: task.id, title: task.title });
      triggered.push({ id: task.id, title: task.title });
    } catch (err) {
      logger.error('reminders: error processing task', {
        taskId: task.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info('reminders: done', { triggered: triggered.length });
  return apiOk({ triggered: triggered.length, tasks: triggered });
}
