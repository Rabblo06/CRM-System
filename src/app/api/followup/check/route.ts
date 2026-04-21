/**
 * GET /api/followup/check
 *
 * Cron job — runs every 60 seconds (via useFollowUpPoller on the client).
 * Finds sent emails with no reply past their follow_up_days deadline,
 * auto-creates a follow-up task, and marks the email as handled.
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

interface FollowUpEmail {
  user_id: string;
  gmail_message_id: string;
  subject: string | null;
  to_email: string | null;
  from_email: string;
  contact_id: string | null;
  follow_up_days: number;
  last_reply_at: string | null;
  created_at: string;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = cronLimiter.check(ip);
  if (!rl.ok) return apiTooManyRequests(rl.retryAfter);

  // Optional secret guard
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    const origin = request.headers.get('origin') || '';
    const host = request.headers.get('host') || '';
    if (origin && !origin.includes(host)) {
      logger.warn('followup/check: unauthorized external request', { origin });
      return apiErr('Forbidden', 403);
    }
  }

  const supabase = adminClient();
  const now = new Date();
  logger.info('followup/check: running', { at: now.toISOString() });

  const { data: emails, error } = await supabase
    .from('synced_emails')
    .select(`
      user_id, gmail_message_id, subject, to_email, from_email,
      contact_id, follow_up_days, last_reply_at, created_at,
      contact:contacts(first_name, last_name)
    `)
    .eq('follow_up_enabled', true)
    .eq('sent_by_user', true)
    .is('follow_up_sent_at', null)
    .is('last_reply_at', null);

  if (error) {
    logger.error('followup/check: query failed', { err: error.message });
    return apiErr('Failed to query follow-up emails', 500);
  }

  if (!emails || emails.length === 0) {
    return apiOk({ created: 0, tasks: [] });
  }

  const due = emails.filter((e) => {
    const sentAt = new Date(e.created_at);
    const deadlineMs = e.follow_up_days * 24 * 60 * 60_000;
    return now.getTime() - sentAt.getTime() >= deadlineMs;
  });

  logger.info('followup/check: candidates', { total: emails.length, due: due.length });

  const created: { taskId: string; subject: string; contactId: string | null }[] = [];

  type EmailRow = FollowUpEmail & {
    contact: { first_name: string; last_name: string }[] | null;
  };

  for (const email of due as unknown as EmailRow[]) {
    const contactArr = email.contact;
    const contactObj = Array.isArray(contactArr) ? contactArr[0] : contactArr;
    const contactName = contactObj
      ? `${contactObj.first_name} ${contactObj.last_name}`.trim()
      : email.to_email || 'contact';

    const taskTitle = `Follow up: "${email.subject || 'email'}" with ${contactName}`;
    const dueDate = new Date(now.getTime() + 24 * 60 * 60_000).toISOString();

    try {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: taskTitle,
          description: `No reply after ${email.follow_up_days} day${email.follow_up_days !== 1 ? 's' : ''}. Follow up regarding: "${email.subject || 'your email'}"`,
          due_date: dueDate,
          priority: 'medium',
          status: 'todo',
          contact_id: email.contact_id || null,
          created_by: email.user_id,
          reminder_minutes: 60,
          reminder_time: new Date(new Date(dueDate).getTime() - 60 * 60_000).toISOString(),
          reminder_sent: false,
        })
        .select('id')
        .single();

      if (taskError) {
        logger.error('followup/check: task insert failed', { err: taskError.message });
        continue;
      }

      await supabase
        .from('synced_emails')
        .update({ follow_up_sent_at: now.toISOString(), follow_up_task_id: task.id })
        .eq('user_id', email.user_id)
        .eq('gmail_message_id', email.gmail_message_id);

      logger.info('followup/check: task created', { taskId: task.id, subject: email.subject });
      created.push({ taskId: task.id, subject: email.subject || '', contactId: email.contact_id });
    } catch (err) {
      logger.error('followup/check: error processing email', {
        messageId: email.gmail_message_id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info('followup/check: done', { created: created.length });
  return apiOk({ created: created.length, tasks: created });
}
