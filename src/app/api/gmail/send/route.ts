import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  if (!data.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(data));
  return data.access_token;
}

function buildRfc2822(opts: {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
}): string {
  const lines: string[] = [];
  lines.push(`From: ${opts.from}`);
  lines.push(`To: ${opts.to}`);
  if (opts.cc?.trim()) lines.push(`Cc: ${opts.cc}`);
  if (opts.bcc?.trim()) lines.push(`Bcc: ${opts.bcc}`);
  lines.push(`Subject: ${opts.subject}`);
  lines.push('MIME-Version: 1.0');
  lines.push('Content-Type: text/html; charset=UTF-8');
  lines.push('');
  lines.push(opts.html);
  return lines.join('\r\n');
}

function toBase64url(str: string): string {
  const b64 = Buffer.from(str).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId, to, cc, bcc, subject, html,
      // Follow-up fields
      follow_up_enabled = false,
      follow_up_days = 3,
      contact_id = null,
    } = body as {
      userId: string;
      to: string;
      cc?: string;
      bcc?: string;
      subject: string;
      html: string;
      follow_up_enabled?: boolean;
      follow_up_days?: number;
      contact_id?: string | null;
    };

    if (!userId || !to || !subject) {
      return NextResponse.json({ error: 'Missing required fields: userId, to, subject' }, { status: 400 });
    }

    const supabase = adminClient();

    const { data: tokenRow, error: tokenErr } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenErr || !tokenRow) {
      return NextResponse.json({ error: 'No Gmail connection found. Please connect Gmail first.' }, { status: 401 });
    }

    let accessToken = tokenRow.access_token;

    // Refresh token if expired (or within 60s of expiry)
    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date(Date.now() + 60_000)) {
      if (tokenRow.refresh_token) {
        accessToken = await refreshToken(tokenRow.refresh_token);
        await supabase.from('google_tokens').update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
        }).eq('user_id', userId);
      }
    }

    const raw = buildRfc2822({
      from: tokenRow.gmail_email,
      to,
      cc,
      bcc,
      subject,
      html: html || '',
    });

    const encoded = toBase64url(raw);

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    const sendData = await sendRes.json();

    if (sendData.error) {
      console.error('[gmail-send] Gmail API error:', sendData.error);
      return NextResponse.json(
        { error: sendData.error.message || 'Failed to send email' },
        { status: sendData.error.code || 500 }
      );
    }

    // Save sent email to synced_emails with follow-up tracking
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

      console.log('[gmail-send] Saved to synced_emails. follow_up_enabled:', follow_up_enabled, 'days:', follow_up_days);
    } catch (saveErr) {
      // Non-fatal — email was sent, just log
      console.warn('[gmail-send] Could not save to synced_emails:', saveErr);
    }

    return NextResponse.json({ success: true, messageId: sendData.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[gmail-send] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
