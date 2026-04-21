import { NextRequest, NextResponse } from 'next/server';
import { apiErr, apiTooManyRequests, getClientIp } from '@/lib/api-error';
import { authLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = authLimiter.check(ip);
  if (!rl.ok) {
    logger.warn('Rate limit hit on gmail/auth', { ip });
    return apiTooManyRequests(rl.retryAfter);
  }

  const userId = request.nextUrl.searchParams.get('user_id');
  if (!userId) return apiErr('Missing user_id', 400);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    logger.error('gmail/auth: GOOGLE_CLIENT_ID not configured');
    return apiErr('Google OAuth is not configured on this server', 503);
  }

  const origin = request.nextUrl.origin;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/gmail/callback`,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: userId,
  });

  logger.info('gmail/auth: initiating OAuth', { userId });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
