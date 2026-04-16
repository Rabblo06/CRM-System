/**
 * GET /api/followup/check
 *
 * Cron job — runs every 60 seconds (via useFollowUpPoller on the client).
 * Finds sent emails with no reply past their follow_up_days deadline,
 * auto-creates a follow-up task, and marks the email as handled.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  // joined
  contact_first_name?: string | null;
  contact_last_name?: string | null;
}

export async function GET(request: NextRequest) {
  // Optional secret guard
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    const origin = request.headers.get('origin') || '';
    const host = request.headers.get('host') || '';
    if (origin && !origin.includes(host)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const supabase = adminClient();
  const now = new Date();
  console.log('[followup/check] Running at', now.toISOString());

  // Find sent emails that:
  // 1. Have follow_up enabled
  // 2. Have NOT already had a follow-up task created
  // 3. Have NO reply (last_reply_at is null)
  // 4. Were sent more than follow_up_days ago
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
    console.error('[followup/check] Query error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!emails || emails.length === 0) {
    console.log('[followup/check] No follow-up emails due');
    return NextResponse.json({ created: 0, tasks: [] });
  }

  // Filter to only emails past their follow_up_days deadline
  const due = emails.filter((e) => {
    const sentAt = new Date(e.created_at);
    const deadlineMs = e.follow_up_days * 24 * 60 * 60 * 1000;
    return now.getTime() - sentAt.getTime() >= deadlineMs;
  });

  console.log(`[followup/check] ${emails.length} candidates, ${due.length} past deadline`);

  const created: { taskId: string; subject: string; contactId: string | null }[] = [];

  type EmailRow = FollowUpEmail & { contact: { first_name: string; last_name: string }[] | null };
  for (const email of due as unknown as EmailRow[]) {
    const contactArr = email.contact;
    const contactObj = Array.isArray(contactArr) ? contactArr[0] : contactArr;
    const contactName = contactObj
      ? `${contactObj.first_name} ${contactObj.last_name}`.trim()
      : email.to_email || 'contact';

    const taskTitle = `Follow up: "${email.subject || 'email'}" with ${contactName}`;
    const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // due tomorrow

    console.log(`[followup/check] Creating task for email "${email.subject}" → user ${email.user_id}`);

    try {
      // Create the follow-up task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: taskTitle,
          description: `No reply received after ${email.follow_up_days} day${email.follow_up_days !== 1 ? 's' : ''}. Follow up with ${contactName} regarding: "${email.subject || 'your email'}"`,
          due_date: dueDate,
          priority: 'medium',
          status: 'todo',
          contact_id: email.contact_id || null,
          created_by: email.user_id,
          reminder_minutes: 60,
          reminder_time: new Date(new Date(dueDate).getTime() - 60 * 60 * 1000).toISOString(),
          reminder_sent: false,
        })
        .select('id')
        .single();

      if (taskError) {
        console.error('[followup/check] Task insert error:', taskError.message);
        continue;
      }

      // Mark the email as handled
      await supabase
        .from('synced_emails')
        .update({
          follow_up_sent_at: now.toISOString(),
          follow_up_task_id: task.id,
        })
        .eq('user_id', email.user_id)
        .eq('gmail_message_id', email.gmail_message_id);

      console.log(`[followup/check] ✓ Task created: ${task.id} for email "${email.subject}"`);
      created.push({ taskId: task.id, subject: email.subject || '', contactId: email.contact_id });
    } catch (err) {
      console.error('[followup/check] Error for email', email.gmail_message_id, err);
    }
  }

  console.log(`[followup/check] Done. Created ${created.length} tasks`);
  return NextResponse.json({ created: created.length, tasks: created });
}
