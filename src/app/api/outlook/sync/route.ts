import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, apiTooManyRequests, getServerUserId } from '@/lib/api-error';
import { apiLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    logger.error('outlook/sync: token refresh failed', { userId });
    throw new Error('Outlook token refresh failed');
  }
  return data.access_token;
}

const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'aol.com', 'icloud.com', 'me.com', 'live.com', 'msn.com',
]);

function companyFromDomain(email: string): { name: string; domain: string } | null {
  const domain = email.split('@')[1];
  if (!domain || PERSONAL_DOMAINS.has(domain)) return null;
  const name = domain.split('.')[0];
  return { name: name.charAt(0).toUpperCase() + name.slice(1), domain };
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = apiLimiter.check(ip);
  if (!rl.ok) return apiTooManyRequests(rl.retryAfter);

  const userId = await getServerUserId(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch {}
      };

      try {
        const supabase = adminClient();

        const { data: tokenRow } = await supabase
          .from('outlook_tokens')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!tokenRow) {
          send({ type: 'error', message: 'No Outlook connection found. Please connect Outlook first.' });
          controller.close();
          return;
        }

        // Ensure user exists in public.users
        await supabase.from('users').upsert(
          { id: userId, email: tokenRow.email, full_name: tokenRow.display_name || '' },
          { onConflict: 'id', ignoreDuplicates: true },
        );

        let accessToken = tokenRow.access_token;

        // Refresh if expired or expiring within 60s
        if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date(Date.now() + 60_000)) {
          if (tokenRow.refresh_token) {
            accessToken = await refreshOutlookToken(tokenRow.refresh_token, userId);
            await supabase.from('outlook_tokens').update({
              access_token: accessToken,
              expires_at: new Date(Date.now() + 3600_000).toISOString(),
            }).eq('user_id', userId);
          }
        }

        send({ type: 'started', email: tokenRow.email });

        const MAX_EMAILS = 500;
        let synced = 0;
        let skipToken: string | undefined;
        const companyCache = new Map<string, string>();
        const contactCache = new Map<string, string>();

        while (synced < MAX_EMAILS) {
          const batchSize = 25;
          const url = new URL('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages');
          url.searchParams.set('$top', String(batchSize));
          url.searchParams.set('$select', 'id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,conversationId');
          url.searchParams.set('$orderby', 'receivedDateTime desc');
          if (skipToken) url.searchParams.set('$skipToken', skipToken);

          const listRes = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const listData = await listRes.json();

          if (listData.error) {
            send({ type: 'error', message: listData.error.message || 'Microsoft Graph API error' });
            break;
          }

          const messages: Array<Record<string, unknown>> = listData.value || [];
          if (!messages.length) break;

          if (synced === 0) {
            send({ type: 'total', total: Math.min(MAX_EMAILS, 500) });
          }

          for (const msg of messages) {
            try {
              const msgId = msg.id as string;
              const subject = (msg.subject as string) || '(no subject)';
              const receivedAt = msg.receivedDateTime as string || new Date().toISOString();
              const isRead = msg.isRead as boolean ?? true;
              const bodyPreview = ((msg.bodyPreview as string) || '').substring(0, 200);
              const conversationId = msg.conversationId as string;

              const fromObj = msg.from as { emailAddress?: { address?: string; name?: string } };
              const fromEmail = fromObj?.emailAddress?.address?.toLowerCase() || '';
              const fromName = fromObj?.emailAddress?.name || '';

              if (!fromEmail || fromEmail === tokenRow.email?.toLowerCase()) { synced++; continue; }

              const toRecipients = (msg.toRecipients as Array<{ emailAddress?: { address?: string } }>) || [];
              const toEmail = toRecipients.map(r => r.emailAddress?.address).filter(Boolean).join(', ');

              // Company detection
              let companyId: string | undefined;
              const companyInfo = companyFromDomain(fromEmail);
              if (companyInfo) {
                if (companyCache.has(companyInfo.domain)) {
                  companyId = companyCache.get(companyInfo.domain);
                } else {
                  const { data: existing } = await supabase
                    .from('companies')
                    .select('id')
                    .eq('domain', companyInfo.domain)
                    .eq('created_by', userId)
                    .maybeSingle();

                  if (existing) {
                    companyId = existing.id;
                  } else {
                    const { data: created, error: compErr } = await supabase
                      .from('companies')
                      .insert({ name: companyInfo.name, domain: companyInfo.domain, created_by: userId })
                      .select('id')
                      .single();
                    if (compErr) logger.error('outlook/sync: company insert error', { err: compErr.message });
                    companyId = created?.id;
                  }
                  if (companyId) companyCache.set(companyInfo.domain, companyId);
                }
              }

              // Contact detection
              let contactId: string | undefined;
              if (contactCache.has(fromEmail)) {
                contactId = contactCache.get(fromEmail);
              } else {
                const { data: existingContact } = await supabase
                  .from('contacts')
                  .select('id')
                  .eq('email', fromEmail)
                  .eq('created_by', userId)
                  .maybeSingle();

                if (existingContact) {
                  contactId = existingContact.id;
                } else {
                  const parts = fromName.split(' ').filter(Boolean);
                  const { data: created, error: contactErr } = await supabase
                    .from('contacts')
                    .upsert({
                      first_name: parts[0] || fromEmail.split('@')[0],
                      last_name: parts.slice(1).join(' ') || '',
                      email: fromEmail,
                      company_id: companyId || null,
                      created_by: userId,
                      lead_status: 'new',
                      lifecycle_stage: 'lead',
                      is_active: true,
                    }, { onConflict: 'email', ignoreDuplicates: true })
                    .select('id')
                    .single();
                  if (contactErr) logger.error('outlook/sync: contact insert error', { err: contactErr.message });
                  contactId = created?.id;
                }
                if (contactId) contactCache.set(fromEmail, contactId);
              }

              // Store email with provider='outlook'
              await supabase.from('synced_emails').upsert(
                {
                  user_id: userId,
                  gmail_message_id: msgId,
                  gmail_thread_id: conversationId || null,
                  subject,
                  from_email: fromEmail,
                  from_name: fromName,
                  to_email: toEmail,
                  body_preview: bodyPreview,
                  received_at: new Date(receivedAt).toISOString(),
                  is_read: isRead,
                  contact_id: contactId || null,
                  company_id: companyId || null,
                  provider: 'outlook',
                },
                { onConflict: 'user_id,gmail_message_id' },
              );
            } catch (e) {
              logger.error('outlook/sync: message processing error', {
                err: e instanceof Error ? e.message : String(e),
              });
            }

            synced++;
            if (synced % 5 === 0) {
              send({ type: 'progress', synced, total: MAX_EMAILS });
            }
          }

          // Graph API uses @odata.nextLink for pagination
          const nextLink = listData['@odata.nextLink'] as string | undefined;
          if (!nextLink) break;
          const nextUrl = new URL(nextLink);
          skipToken = nextUrl.searchParams.get('$skipToken') || undefined;
          if (!skipToken) break;
        }

        send({ type: 'complete', synced, email: tokenRow.email });
      } catch (err: unknown) {
        logger.error('outlook/sync: fatal error', {
          err: err instanceof Error ? err.message : String(err),
        });
        send({ type: 'error', message: 'Outlook sync failed. Please try again.' });
      } finally {
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
