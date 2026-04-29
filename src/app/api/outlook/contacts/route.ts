import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, apiTooManyRequests, getServerUserId } from '@/lib/api-error';
import { apiLimiter } from '@/lib/rate-limit';
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
  if (!data.access_token) throw new Error('Token refresh failed');
  return data.access_token;
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

        let accessToken = tokenRow.access_token;

        if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date(Date.now() + 60_000)) {
          if (tokenRow.refresh_token) {
            accessToken = await refreshOutlookToken(tokenRow.refresh_token, userId);
            await supabase.from('outlook_tokens').update({
              access_token: accessToken,
              expires_at: new Date(Date.now() + 3600_000).toISOString(),
            }).eq('user_id', userId);
          }
        }

        let nextLink: string | undefined;
        let imported = 0;

        do {
          const url = nextLink
            || 'https://graph.microsoft.com/v1.0/me/contacts?$top=100&$select=givenName,surname,emailAddresses,mobilePhone,businessPhones,companyName,jobTitle';

          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const data = await res.json();

          if (data.error) {
            logger.error('outlook/contacts: Graph API error', { msg: data.error.message });
            send({ type: 'error', message: 'Failed to fetch Outlook contacts. Please reconnect Outlook.' });
            break;
          }

          const contacts: Array<Record<string, unknown>> = data.value || [];

          for (const person of contacts) {
            try {
              const emailAddresses = (person.emailAddresses as Array<{ address?: string }>) || [];
              if (!emailAddresses.length) continue;

              const email = emailAddresses[0].address?.toLowerCase();
              if (!email) continue;

              const givenName = (person.givenName as string) || email.split('@')[0];
              const surname = (person.surname as string) || '';
              const mobile = (person.mobilePhone as string) || null;
              const businessPhones = (person.businessPhones as string[]) || [];
              const phone = businessPhones[0] || null;
              const companyName = (person.companyName as string) || null;
              const jobTitle = (person.jobTitle as string) || null;

              let companyId: string | null = null;
              if (companyName) {
                const { data: co } = await supabase
                  .from('companies')
                  .select('id')
                  .ilike('name', companyName)
                  .eq('created_by', userId)
                  .maybeSingle();

                if (co) {
                  companyId = co.id;
                } else {
                  const { data: newCo } = await supabase
                    .from('companies')
                    .insert({ name: companyName, created_by: userId })
                    .select('id')
                    .single();
                  companyId = newCo?.id || null;
                }
              }

              await supabase.from('contacts').upsert(
                {
                  first_name: givenName,
                  last_name: surname,
                  email,
                  phone: phone || undefined,
                  mobile: mobile || undefined,
                  job_title: jobTitle || undefined,
                  company_id: companyId,
                  created_by: userId,
                  lead_status: 'new',
                  lifecycle_stage: 'lead',
                  is_active: true,
                  source: 'outlook_contacts',
                },
                { onConflict: 'email' },
              );

              imported++;
              if (imported % 10 === 0) send({ type: 'progress', imported });
            } catch (personErr) {
              logger.warn('outlook/contacts: skipping contact due to error', {
                err: personErr instanceof Error ? personErr.message : String(personErr),
              });
            }
          }

          nextLink = data['@odata.nextLink'] as string | undefined;
        } while (nextLink);

        logger.info('outlook/contacts: sync complete', { userId, imported });
        send({ type: 'complete', imported });
      } catch (err: unknown) {
        logger.error('outlook/contacts: fatal error', {
          err: err instanceof Error ? err.message : String(err),
        });
        send({ type: 'error', message: 'Contacts sync failed. Please try again.' });
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
    },
  });
}
