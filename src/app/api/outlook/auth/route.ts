import { NextRequest, NextResponse } from 'next/server';
import { apiErr, getServerUserId } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const userId = await getServerUserId(request);
  if (!userId) return apiErr('Unauthorized', 401);

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    logger.error('outlook/auth: MICROSOFT_CLIENT_ID not configured');
    return apiErr('Microsoft OAuth is not configured on this server', 503);
  }

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const origin = `${proto}://${host}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/outlook/callback`,
    response_type: 'code',
    scope: [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Contacts.Read',
      'https://graph.microsoft.com/User.Read',
      'offline_access',
    ].join(' '),
    response_mode: 'query',
    state: userId,
  });

  logger.info('outlook/auth: initiating OAuth', { userId });
  return NextResponse.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`);
}
