import { NextRequest, NextResponse } from 'next/server';
import { apiErr, apiTooManyRequests, getClientIp, getServerUserId } from '@/lib/api-error';
import { authLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = authLimiter.check(ip);
  if (!rl.ok) {
    logger.warn('Rate limit hit on calendar/auth', { ip });
    return apiTooManyRequests(rl.retryAfter);
  }

  const userId = await getServerUserId(request);
  if (!userId) return apiErr('Unauthorized', 401);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    logger.error('calendar/auth: GOOGLE_CLIENT_ID not configured');
    return apiErr('Google OAuth is not configured on this server', 503);
  }

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const origin = `${proto}://${host}`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/calendar/callback`,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: userId,
  });

  logger.info('calendar/auth: initiating OAuth', { userId });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
