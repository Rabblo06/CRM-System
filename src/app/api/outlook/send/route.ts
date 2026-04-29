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

async function refreshOutlookToken(refreshTkn: string, userId: string): Promise<string> {
  const host = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTkn,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirect_uri: `${host}/api/outlook/callback`,
      scope: [
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/Contacts.Read',
        'https://graph.microsoft.com/User.Read',
        'offline_access',
      ].join(' '),
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    logger.error('outlook/send: token refresh failed', { userId });
    throw new Error('Token refresh failed');
  }
  return data.access_token;
}

export const POST = withRoute(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rl = emailLimiter.check(ip);
  if (!rl.ok) {
    logger.warn('Rate limit hit on outlook/send', { ip });
    return apiTooManyRequests(rl.retryAfter);
  }

  const body = await request.json().catch(() => null);
  if (!body) return apiErr('Invalid request body', 400);

  const {
    userId, to, cc, bcc, subject, html,
    contact_id = null,
  } = body as {
    userId: string; to: string; cc?: string; bcc?: string;
    subject: string; html: string;
    contact_id?: string | null;
  };

  if (!userId || !to || !subject) {
    return apiErr('Missing required fields: userId, to, subject', 400);
  }

  const supabase = adminClient();

  const { data: tokenRow, error: tokenErr } = await supabase
    .from('outlook_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (tokenErr || !tokenRow) {
    logger.warn('outlook/send: no token found', { userId });
    return apiErr('No Outlook connection found. Please connect Outlook first.', 401);
  }

  let accessToken = tokenRow.access_token;

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date(Date.now() + 60_000)) {
    if (tokenRow.refresh_token) {
      try {
        accessToken = await refreshOutlookToken(tokenRow.refresh_token, userId);
        await supabase.from('outlook_tokens').update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
        }).eq('user_id', userId);
      } catch {
        logger.error('outlook/send: token refresh failed', { userId });
        return apiErr('Outlook session expired. Please reconnect Outlook.', 401);
      }
    }
  }

  // Build Graph API sendMail payload
  const toAddresses = to.split(',').map(a => a.trim()).filter(Boolean).map(addr => ({
    emailAddress: { address: addr },
  }));
  const ccAddresses = cc ? cc.split(',').map(a => a.trim()).filter(Boolean).map(addr => ({
    emailAddress: { address: addr },
  })) : [];
  const bccAddresses = bcc ? bcc.split(',').map(a => a.trim()).filter(Boolean).map(addr => ({
    emailAddress: { address: addr },
  })) : [];

  const message: Record<string, unknown> = {
    subject,
    body: { contentType: 'HTML', content: html || '' },
    toRecipients: toAddresses,
  };
  if (ccAddresses.length) message.ccRecipients = ccAddresses;
  if (bccAddresses.length) message.bccRecipients = bccAddresses;

  const sendRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });

  if (!sendRes.ok) {
    let errMsg = 'Failed to send email. Please try again.';
    try {
      const errData = await sendRes.json();
      errMsg = errData?.error?.message || errMsg;
      logger.error('outlook/send: Graph API error', { status: sendRes.status, msg: errMsg });
    } catch {}
    const isAuthErr = sendRes.status === 401 || sendRes.status === 403;
    return apiErr(
      isAuthErr ? 'Outlook authorization error. Please reconnect your Outlook account.' : errMsg,
      sendRes.status,
    );
  }

  // Persist sent email (non-fatal)
  try {
    const messageId = `outlook_sent_${Date.now()}_${userId.slice(0, 8)}`;
    await supabase.from('synced_emails').upsert({
      user_id: userId,
      gmail_message_id: messageId,
      gmail_thread_id: null,
      subject,
      from_email: tokenRow.email,
      to_email: to,
      body_preview: (html || '').replace(/<[^>]+>/g, '').slice(0, 300),
      received_at: new Date().toISOString(),
      is_read: true,
      sent_by_user: true,
      contact_id: contact_id || null,
      provider: 'outlook',
    }, { onConflict: 'user_id,gmail_message_id' });
  } catch (saveErr) {
    logger.warn('outlook/send: could not persist to synced_emails', {
      err: saveErr instanceof Error ? saveErr.message : String(saveErr),
    });
  }

  logger.info('outlook/send: email sent', { userId, to, subject });
  return apiOk({ success: true });
});
