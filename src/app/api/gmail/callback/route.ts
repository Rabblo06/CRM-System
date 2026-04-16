import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // user_id (UUID)
  const error = searchParams.get('error');

  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}/auth/gmail-callback?error=${encodeURIComponent(msg)}`);

  if (error) return fail(error);
  if (!code || !state) return fail('missing_params');

  // Exchange auth code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/gmail/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();
  if (tokens.error) return fail(tokens.error_description || tokens.error);

  // Get Gmail user info
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userInfoRes.json();
  if (!userInfo.email) return fail('could_not_get_email');

  // Store tokens securely in Supabase (service role bypasses RLS)
  const supabase = adminClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error: dbError } = await supabase.from('google_tokens').upsert(
    {
      user_id: state,
      gmail_email: userInfo.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (dbError) return fail('db_error: ' + dbError.message);

  // Ensure user row exists in public.users (required FK for contacts/companies)
  await supabase.from('users').upsert(
    {
      id: state,
      email: userInfo.email,
      username: userInfo.email.split('@')[0],
      full_name: userInfo.name || '',
      password_hash: 'oauth_user',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  // Redirect to a tiny client page that posts message to opener
  const params = new URLSearchParams({
    email: userInfo.email,
    name: userInfo.name || '',
  });
  return NextResponse.redirect(`${origin}/auth/gmail-callback?${params}`);
}
