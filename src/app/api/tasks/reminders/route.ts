/**
 * GET /api/tasks/reminders
 *
 * Background cron job — checks for due reminders and fires them.
 * Call this every 60 seconds via:
 *   - Vercel Cron (vercel.json)
 *   - Client-side polling in useReminderPoller hook
 *   - External cron service hitting: GET /api/tasks/reminders?secret=YOUR_CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  // Optional secret guard for external cron callers
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    // Allow unauthenticated from same origin (client polling)
    const origin = request.headers.get('origin') || '';
    const host = request.headers.get('host') || '';
    const isInternal = origin.includes(host) || !origin;
    if (!isInternal) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const supabase = adminClient();
  const now = new Date().toISOString();

  console.log('[reminders] Running check at', now);

  // Find all tasks where reminder is due and not yet sent
  const { data: dueTasks, error } = await supabase
    .from('tasks')
    .select('id, title, due_date, reminder_minutes, reminder_time, created_by')
    .lte('reminder_time', now)
    .eq('reminder_sent', false)
    .not('reminder_time', 'is', null);

  if (error) {
    console.error('[reminders] Query error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('[reminders] Found', dueTasks?.length ?? 0, 'due reminders');

  if (!dueTasks || dueTasks.length === 0) {
    return NextResponse.json({ triggered: 0, tasks: [] });
  }

  const triggered: { id: string; title: string }[] = [];

  for (const task of dueTasks as DueTask[]) {
    console.log('[reminders] Triggering reminder for task:', task.id, task.title);

    try {
      // Mark as sent FIRST to prevent double-firing even if subsequent steps fail
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ reminder_sent: true })
        .eq('id', task.id);

      if (updateError) {
        console.error('[reminders] Failed to mark task sent:', task.id, updateError.message);
        continue;
      }

      console.log('[reminders] ✓ Marked reminder_sent=true for task:', task.id);

      triggered.push({ id: task.id, title: task.title });
    } catch (err) {
      console.error('[reminders] Error processing task:', task.id, err);
    }
  }

  console.log('[reminders] Done. Triggered:', triggered.length);
  return NextResponse.json({ triggered: triggered.length, tasks: triggered });
}
