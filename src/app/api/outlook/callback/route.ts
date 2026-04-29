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
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const userId = searchParams.get('state');
  const error = searchParams.get('error');

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const origin = `${proto}://${host}`;

  if (error || !code || !userId) {
    logger.error('outlook/callback: OAuth error', { error, hasCode: !!code, hasUserId: !!userId });
    return NextResponse.redirect(`${origin}/auth/outlook-callback?error=${encodeURIComponent(error || 'missing_params')}`);
  }

  try {
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: `${origin}/api/outlook/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      logger.error('outlook/callback: token exchange failed', { err: tokenData.error });
      return NextResponse.redirect(`${origin}/auth/outlook-callback?error=token_exchange_failed`);
    }

    // Fetch user profile
    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    const email = profile.mail || profile.userPrincipalName || '';
    const name = profile.displayName || '';

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const supabase = adminClient();
    await supabase.from('outlook_tokens').upsert({
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || '',
      expires_at: expiresAt,
      email,
    }, { onConflict: 'user_id' });

    logger.info('outlook/callback: token stored', { userId, email });
    return NextResponse.redirect(
      `${origin}/auth/outlook-callback?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`,
    );
  } catch (err) {
    logger.error('outlook/callback: unexpected error', { err });
    return NextResponse.redirect(`${origin}/auth/outlook-callback?error=server_error`);
  }
}
