import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, apiTooManyRequests } from '@/lib/api-error';
import { apiLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
  return data.access_token;
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string) {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

function parseFrom(from: string): { email: string; name: string } {
  const m = from.match(/^(.+?)\s*<(.+)>$/);
  if (m) return { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim() };
  return { name: '', email: from.trim() };
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

  const userId = request.nextUrl.searchParams.get('user_id');
  if (!userId) return new Response('Missing user_id', { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch {}
      };

      try {
        const supabase = adminClient();

        // Fetch stored tokens
        const { data: tokenRow } = await supabase
          .from('google_tokens')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!tokenRow) {
          send({ type: 'error', message: 'No Gmail connection found. Please connect Gmail first.' });
          controller.close();
          return;
        }

        // Ensure user exists in public.users (FK required by contacts/companies)
        await supabase.from('users').upsert(
          {
            id: userId,
            email: tokenRow.gmail_email,
            full_name: '',
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );

        let accessToken = tokenRow.access_token;

        // Refresh if expired
        if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date(Date.now() + 60_000)) {
          if (tokenRow.refresh_token) {
            accessToken = await refreshToken(tokenRow.refresh_token);
            await supabase.from('google_tokens').update({
              access_token: accessToken,
              expires_at: new Date(Date.now() + 3600_000).toISOString(),
            }).eq('user_id', userId);
          }
        }

        send({ type: 'started', gmailEmail: tokenRow.gmail_email });

        const MAX_EMAILS = 500;
        let pageToken: string | undefined;
        let synced = 0;
        let estimated = MAX_EMAILS;

        // Company + contact caches to avoid repeated DB lookups
        const companyCache = new Map<string, string>(); // domain → company_id
        const contactCache = new Map<string, string>(); // email → contact_id

        while (synced < MAX_EMAILS) {
          const batchSize = 25;
          const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
          url.searchParams.set('maxResults', String(batchSize));
          url.searchParams.set('q', '-in:spam -in:trash -category:promotions -category:social');
          if (pageToken) url.searchParams.set('pageToken', pageToken);

          const listRes = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const listData = await listRes.json();

          if (listData.error) {
            send({ type: 'error', message: listData.error.message });
            break;
          }

          if (!listData.messages?.length) break;

          // Update estimate from first batch
          if (synced === 0 && listData.resultSizeEstimate) {
            estimated = Math.min(listData.resultSizeEstimate, MAX_EMAILS);
            send({ type: 'total', total: estimated });
          }

          for (const msg of listData.messages as Array<{ id: string }>) {
            try {
              const msgRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}` +
                `?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              const msgData = await msgRes.json();
              if (msgData.error) { synced++; continue; }

              const hdrs = msgData.payload?.headers || [];
              const fromRaw = getHeader(hdrs, 'From');
              const toRaw = getHeader(hdrs, 'To');
              const subject = getHeader(hdrs, 'Subject') || '(no subject)';
              const dateRaw = getHeader(hdrs, 'Date');

              const { email: fromEmail, name: fromName } = parseFrom(fromRaw);
              if (!fromEmail || fromEmail === tokenRow.gmail_email) { synced++; continue; }

              const receivedAt = dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString();
              const isRead = !msgData.labelIds?.includes('UNREAD');
              const snippet = (msgData.snippet || '').substring(0, 200);

              // --- Company detection ---
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
                    if (compErr) logger.error('gmail/sync: company insert error', { err: compErr.message, domain: companyInfo.domain });
                    companyId = created?.id;
                  }
                  if (companyId) companyCache.set(companyInfo.domain, companyId);
                }
              }

              // --- Contact detection ---
              let contactId: string | undefined;
              if (contactCache.has(fromEmail)) {
                contactId = contactCache.get(fromEmail);
              } else {
                // Look up by email + user (per-user unique constraint)
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
                  if (contactErr) logger.error('gmail/sync: contact insert error', { err: contactErr.message, email: fromEmail });
                  contactId = created?.id;
                }
                if (contactId) contactCache.set(fromEmail, contactId);
              }

              // --- Store email ---
              await supabase.from('synced_emails').upsert(
                {
                  user_id: userId,
                  gmail_message_id: msg.id,
                  gmail_thread_id: msgData.threadId,
                  subject,
                  from_email: fromEmail,
                  from_name: fromName,
                  to_email: toRaw,
                  body_preview: snippet,
                  received_at: receivedAt,
                  is_read: isRead,
                  contact_id: contactId || null,
                  company_id: companyId || null,
                },
                { onConflict: 'user_id,gmail_message_id' }
              );
            } catch (e) {
              logger.error('gmail/sync: message processing error', {
                err: e instanceof Error ? e.message : String(e),
              });
            }

            synced++;
            if (synced % 5 === 0) {
              send({ type: 'progress', synced, total: estimated });
            }
          }

          if (!listData.nextPageToken) break;
          pageToken = listData.nextPageToken;
        }

        send({ type: 'complete', synced, gmailEmail: tokenRow.gmail_email });
      } catch (err: unknown) {
        logger.error('gmail/sync: fatal error', {
          err: err instanceof Error ? err.message : String(err),
        });
        send({ type: 'error', message: 'Email sync failed. Please try again.' });
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
