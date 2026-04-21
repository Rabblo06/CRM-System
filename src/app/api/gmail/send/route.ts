import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiOk, apiErr, apiTooManyRequests, getClientIp, withRoute } from '@/lib/api-error';
import { emailLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function refreshToken(refreshTkn: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshTkn,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token refresh failed');
  return data.access_token;
}

function buildRfc2822(opts: {
  from: string; to: string; cc?: string; bcc?: string;
  subject: string; html: string;
}): string {
  const lines: string[] = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    ...(opts.cc?.trim() ? [`Cc: ${opts.cc}`] : []),
    ...(opts.bcc?.trim() ? [`Bcc: ${opts.bcc}`] : []),
    `Subject: ${opts.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    opts.html,
  ];
  return lines.join('\r\n');
}

function toBase64url(str: string): string {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const POST = withRoute(async (request: NextRequest) => {
  // Rate limit per user ID (not just IP) to prevent sender abuse
  const ip = getClientIp(request);
  const rl = emailLimiter.check(ip);
  if (!rl.ok) {
    logger.warn('Rate limit hit on gmail/send', { ip });
    return apiTooManyRequests(rl.retryAfter);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiErr('Invalid request body', 400);

  const {
    userId, to, cc, bcc, subject, html,
    follow_up_enabled = false,
    follow_up_days = 3,
    contact_id = null,
  } = body as {
    userId: string; to: string; cc?: string; bcc?: string;
    subject: string; html: string;
    follow_up_enabled?: boolean; follow_up_days?: number;
    contact_id?: string | null;
  };

  if (!userId || !to || !subject) {
    return apiErr('Missing required fields: userId, to, subject', 400);
  }

  const supabase = adminClient();

  const { data: tokenRow, error: tokenErr } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (tokenErr || !tokenRow) {
    logger.warn('gmail/send: no token found', { userId });
    return apiErr('No Gmail connection found. Please connect Gmail first.', 401);
  }

  let accessToken = tokenRow.access_token;

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date(Date.now() + 60_000)) {
    if (tokenRow.refresh_token) {
      try {
        accessToken = await refreshToken(tokenRow.refresh_token);
        await supabase.from('google_tokens').update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        }).eq('user_id', userId);
      } catch {
        logger.error('gmail/send: token refresh failed', { userId });
        return apiErr('Gmail session expired. Please reconnect Gmail.', 401);
      }
    }
  }

  const raw = buildRfc2822({ from: tokenRow.gmail_email, to, cc, bcc, subject, html: html || '' });
  const encoded = toBase64url(raw);

  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded }),
  });

  const sendData = await sendRes.json();

  if (sendData.error) {
    logger.error('gmail/send: Gmail API error', { code: sendData.error.code, msg: sendData.error.message });
    // Distinguish auth errors so the client can prompt reconnect
    const isAuthErr = [401, 403].includes(sendData.error.code);
    return apiErr(
      isAuthErr
        ? 'Gmail authorization error. Please reconnect your Gmail account.'
        : 'Failed to send email. Please try again.',
      sendData.error.code || 500,
    );
  }

  // Persist to synced_emails (non-fatal)
  try {
    await supabase.from('synced_emails').upsert({
      user_id: userId,
      gmail_message_id: sendData.id,
      gmail_thread_id: sendData.threadId || null,
      subject,
      from_email: tokenRow.gmail_email,
      to_email: to,
      body_preview: (html || '').replace(/<[^>]+>/g, '').slice(0, 300),
      received_at: new Date().toISOString(),
      is_read: true,
      sent_by_user: true,
      contact_id: contact_id || null,
      follow_up_enabled: !!follow_up_enabled,
      follow_up_days: follow_up_days || 3,
      last_reply_at: null,
      follow_up_sent_at: null,
    }, { onConflict: 'user_id,gmail_message_id' });
  } catch (saveErr) {
    logger.warn('gmail/send: could not persist to synced_emails', {
      err: saveErr instanceof Error ? saveErr.message : String(saveErr),
    });
  }

  logger.info('gmail/send: email sent', { userId, to, subject, follow_up_enabled });
  return apiOk({ success: true, messageId: sendData.id });
});
