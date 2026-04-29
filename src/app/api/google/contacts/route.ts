import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUserId } from '@/lib/api-error';
import { logger } from '@/lib/logger';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function getValidAccessToken(
  supabase: ReturnType<typeof adminClient>,
  userId: string,
  row: { access_token: string; refresh_token: string; expires_at: string },
): Promise<string> {
  const expiresAt = new Date(row.expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) return row.access_token;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: row.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (data.access_token) {
    const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();
    await supabase
      .from('google_tokens')
      .update({ access_token: data.access_token, expires_at: newExpiry })
      .eq('user_id', userId);
    return data.access_token;
  }
  return row.access_token;
}

interface GooglePerson {
  names?: Array<{ metadata?: { primary?: boolean }; givenName?: string; familyName?: string }>;
  emailAddresses?: Array<{ metadata?: { primary?: boolean }; value?: string }>;
  phoneNumbers?: Array<{ metadata?: { primary?: boolean }; value?: string }>;
  organizations?: Array<{ metadata?: { primary?: boolean }; name?: string; title?: string }>;
}

export async function POST(request: NextRequest) {
  const userId = await getServerUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = adminClient();

  const { data: tokenRow, error: tokenErr } = await supabase
    .from('google_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (tokenErr || !tokenRow?.access_token) {
    return NextResponse.json({ error: 'Google account not connected' }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(supabase, userId, tokenRow);
  } catch {
    return NextResponse.json({ error: 'Failed to refresh Google token' }, { status: 400 });
  }

  // Fetch all Google Contacts via People API (paginated)
  const allPeople: GooglePerson[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      personFields: 'names,emailAddresses,phoneNumbers,organizations',
      pageSize: '1000',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `https://people.googleapis.com/v1/people/me/connections?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await res.json();

    if (data.error) {
      logger.error('google/contacts: People API error', { err: data.error });
      break;
    }
    if (data.connections) allPeople.push(...data.connections);
    pageToken = data.nextPageToken;
  } while (pageToken);

  let contactsCreated = 0;
  let contactsUpdated = 0;
  let companiesCreated = 0;
  const companyCache: Record<string, string> = {};

  for (const person of allPeople) {
    const emailArr = person.emailAddresses || [];
    const primaryEmail =
      emailArr.find(e => e.metadata?.primary)?.value ||
      emailArr[0]?.value;
    if (!primaryEmail) continue;
    const email = primaryEmail.toLowerCase().trim();

    const nameArr = person.names || [];
    const nameObj = nameArr.find(n => n.metadata?.primary) || nameArr[0];
    const firstName = nameObj?.givenName?.trim() || '';
    const lastName  = nameObj?.familyName?.trim() || '';
    if (!firstName && !lastName) continue;

    const phoneArr = person.phoneNumbers || [];
    const phone =
      phoneArr.find(p => p.metadata?.primary)?.value ||
      phoneArr[0]?.value;

    const orgArr = person.organizations || [];
    const org = orgArr.find(o => o.metadata?.primary) || orgArr[0];
    const orgName = org?.name?.trim();
    const jobTitle = org?.title?.trim();

    // Find or create company
    let companyId: string | undefined;
    if (orgName) {
      const cacheKey = orgName.toLowerCase();
      if (companyCache[cacheKey]) {
        companyId = companyCache[cacheKey];
      } else {
        const { data: existingCo } = await supabase
          .from('companies')
          .select('id')
          .eq('created_by', userId)
          .ilike('name', orgName)
          .maybeSingle();

        if (existingCo) {
          companyId = existingCo.id;
        } else {
          const domain = email.split('@')[1] || undefined;
          const { data: newCo } = await supabase
            .from('companies')
            .insert({ name: orgName, domain, created_by: userId })
            .select('id')
            .single();
          if (newCo) { companyId = newCo.id; companiesCreated++; }
        }
        if (companyId) companyCache[cacheKey] = companyId;
      }
    }

    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('created_by', userId)
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      await supabase.from('contacts').update({
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        ...(phone && { phone }),
        ...(jobTitle && { job_title: jobTitle }),
        ...(companyId && { company_id: companyId }),
      }).eq('id', existing.id);
      contactsUpdated++;
    } else {
      await supabase.from('contacts').insert({
        first_name: firstName,
        last_name: lastName,
        email,
        ...(phone && { phone }),
        ...(jobTitle && { job_title: jobTitle }),
        ...(companyId && { company_id: companyId }),
        created_by: userId,
        is_active: true,
        lead_status: 'new',
        lifecycle_stage: 'lead',
        source: 'google_contacts',
      });
      contactsCreated++;
    }
  }

  logger.info('google/contacts: sync complete', {
    userId, total: allPeople.length, contactsCreated, contactsUpdated, companiesCreated,
  });

  return NextResponse.json({
    success: true,
    total: allPeople.length,
    contacts_created: contactsCreated,
    contacts_updated: contactsUpdated,
    companies_created: companiesCreated,
  });
}
