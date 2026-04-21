import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const origin = `${proto}://${host}`;
  const code  = searchParams.get('code');
  const state = searchParams.get('state'); // user_id (UUID)
  const oauthError = searchParams.get('error');

  const fail = (slug: string) =>
    NextResponse.redirect(`${origin}/auth/calendar-callback?error=${encodeURIComponent(slug)}`);

  try {
    if (oauthError) {
      logger.warn('calendar/callback: OAuth error from Google', { oauthError });
      return fail('oauth_error');
    }
    if (!code || !state) {
      logger.warn('calendar/callback: missing code or state');
      return fail('missing_params');
    }

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
    if (tokens.error) {
      logger.error('calendar/callback: token exchange failed', { err: tokens.error });
      return fail('token_exchange_failed');
    }

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();
    if (!userInfo.email) {
      logger.error('calendar/callback: could not get user email');
      return fail('no_email');
    }

    const supabase = adminClient();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Check if a row exists — update vs. insert to preserve Gmail tokens
    const { data: existing } = await supabase
      .from('google_tokens')
      .select('user_id')
      .eq('user_id', state)
      .maybeSingle();

    let dbError;
    if (existing) {
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

    if (dbError) {
      logger.error('calendar/callback: DB error', { err: dbError.message });
      return fail('db_error');
    }

    logger.info('calendar/callback: connected Calendar', { userId: state, email: userInfo.email });

    const params = new URLSearchParams({ email: userInfo.email, name: userInfo.name || '' });
    return NextResponse.redirect(`${origin}/auth/calendar-callback?${params}`);
  } catch (err) {
    logger.error('calendar/callback: unexpected error', {
      err: err instanceof Error ? err.message : String(err),
    });
    return fail('internal_error');
  }
}
