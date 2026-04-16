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
    NextResponse.redirect(`${origin}/auth/calendar-callback?error=${encodeURIComponent(msg)}`);

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
      redirect_uri: `${origin}/api/calendar/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();
  if (tokens.error) return fail(tokens.error_description || tokens.error);

  // Get user info
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userInfoRes.json();
  if (!userInfo.email) return fail('could_not_get_email');

  // Store calendar tokens in Supabase
  const supabase = adminClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // First check if a row exists for this user
  const { data: existing } = await supabase
    .from('google_tokens')
    .select('user_id')
    .eq('user_id', state)
    .maybeSingle();

  let dbError;
  if (existing) {
    // Update existing row
    const { error } = await supabase.from('google_tokens').update({
      calendar_email: userInfo.email,
      calendar_access_token: tokens.access_token,
      calendar_refresh_token: tokens.refresh_token,
      calendar_expires_at: expiresAt,
      has_calendar: true,
      updated_at: new Date().toISOString(),
    }).eq('user_id', state);
    dbError = error;
  } else {
    // Insert new row
    const { error } = await supabase.from('google_tokens').insert({
      user_id: state,
      calendar_email: userInfo.email,
      calendar_access_token: tokens.access_token,
      calendar_refresh_token: tokens.refresh_token,
      calendar_expires_at: expiresAt,
      has_calendar: true,
      updated_at: new Date().toISOString(),
    });
    dbError = error;
  }

  if (dbError) return fail('db_error: ' + dbError.message);

  // Redirect to client-side callback page
  const params = new URLSearchParams({
    email: userInfo.email,
    name: userInfo.name || '',
  });
  return NextResponse.redirect(`${origin}/auth/calendar-callback?${params}`);
}
