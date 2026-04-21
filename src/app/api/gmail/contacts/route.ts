import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClientIp, apiTooManyRequests } from '@/lib/api-error';
import { apiLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
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

        const { data: tokenRow } = await supabase
          .from('google_tokens')
          .select('access_token, refresh_token, expires_at')
          .eq('user_id', userId)
          .single();

        if (!tokenRow) {
          send({ type: 'error', message: 'No Gmail connection found. Please connect Gmail first.' });
          controller.close();
          return;
        }

        const accessToken = tokenRow.access_token;

        let pageToken: string | undefined;
        let imported = 0;

        while (true) {
          const url = new URL('https://people.googleapis.com/v1/people/me/connections');
          url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,organizations');
          url.searchParams.set('pageSize', '100');
          if (pageToken) url.searchParams.set('pageToken', pageToken);

          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const data = await res.json();

          if (data.error) {
            logger.error('gmail/contacts: People API error', { msg: data.error.message });
            send({ type: 'error', message: 'Failed to fetch Google Contacts. Please reconnect Gmail.' });
            break;
          }

          const connections: Array<Record<string, unknown>> = data.connections || [];

          for (const person of connections) {
            try {
              const names = (person.names as Array<{ displayName?: string; givenName?: string; familyName?: string }>) || [];
              const emails = (person.emailAddresses as Array<{ value?: string }>) || [];
              const phones = (person.phoneNumbers as Array<{ value?: string }>) || [];
              const orgs = (person.organizations as Array<{ name?: string }>) || [];

              if (!emails.length) continue;

              const email = emails[0].value?.toLowerCase();
              if (!email) continue;

              const givenName = names[0]?.givenName || email.split('@')[0];
              const familyName = names[0]?.familyName || '';
              const phone = phones[0]?.value || null;
              const orgName = orgs[0]?.name || null;

              let companyId: string | null = null;
              if (orgName) {
                const { data: co } = await supabase
                  .from('companies')
                  .select('id')
                  .ilike('name', orgName)
                  .eq('created_by', userId)
                  .maybeSingle();

                if (co) {
                  companyId = co.id;
                } else {
                  const { data: newCo } = await supabase
                    .from('companies')
                    .insert({ name: orgName, created_by: userId })
                    .select('id')
                    .single();
                  companyId = newCo?.id || null;
                }
              }

              await supabase.from('contacts').upsert(
                {
                  first_name: givenName,
                  last_name: familyName,
                  email,
                  phone: phone || undefined,
                  company_id: companyId,
                  created_by: userId,
                  lead_status: 'new',
                  lifecycle_stage: 'lead',
                  is_active: true,
                  source: 'google_contacts',
                },
                { onConflict: 'email' },
              );

              imported++;
              if (imported % 10 === 0) send({ type: 'progress', imported });
            } catch (personErr) {
              logger.warn('gmail/contacts: skipping person due to error', {
                err: personErr instanceof Error ? personErr.message : String(personErr),
              });
            }
          }

          if (!data.nextPageToken) break;
          pageToken = data.nextPageToken;
        }

        logger.info('gmail/contacts: sync complete', { userId, imported });
        send({ type: 'complete', imported });
      } catch (err: unknown) {
        logger.error('gmail/contacts: fatal error', {
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
