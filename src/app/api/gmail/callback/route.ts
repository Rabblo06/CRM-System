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

  // Redirect to client page with a safe error slug — never expose raw OAuth messages
  const fail = (slug: string) =>
    NextResponse.redirect(`${origin}/auth/gmail-callback?error=${encodeURIComponent(slug)}`);

  try {
    if (oauthError) {
      logger.warn('gmail/callback: OAuth error from Google', { oauthError });
      return fail('oauth_error');
    }
    if (!code || !state) {
      logger.warn('gmail/callback: missing code or state');
      return fail('missing_params');
    }

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
    if (tokens.error) {
      logger.error('gmail/callback: token exchange failed', { err: tokens.error });
      return fail('token_exchange_failed');
    }

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();
    if (!userInfo.email) {
      logger.error('gmail/callback: could not get user email');
      return fail('no_email');
    }

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
      { onConflict: 'user_id' },
    );

    if (dbError) {
      logger.error('gmail/callback: DB upsert failed', { err: dbError.message });
      return fail('db_error');
    }

    // Ensure user row exists (required FK for contacts/companies)
    await supabase.from('users').upsert(
      {
        id: state,
        email: userInfo.email,
        full_name: userInfo.name || '',
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );

    logger.info('gmail/callback: connected Gmail', { userId: state, email: userInfo.email });

    const params = new URLSearchParams({ email: userInfo.email, name: userInfo.name || '' });
    return NextResponse.redirect(`${origin}/auth/gmail-callback?${params}`);
  } catch (err) {
    logger.error('gmail/callback: unexpected error', {
      err: err instanceof Error ? err.message : String(err),
    });
    return fail('internal_error');
  }
}
