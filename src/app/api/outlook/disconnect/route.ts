import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiOk, apiErr, withRoute, getServerUserId } from '@/lib/api-error';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const DELETE = withRoute(async (request: NextRequest) => {
  const userId = await getServerUserId(request);
  if (!userId) return apiErr('Unauthorized', 401);

  const supabase = adminClient();

  const { error: tokenErr } = await supabase
    .from('outlook_tokens')
    .delete()
    .eq('user_id', userId);

  if (tokenErr) {
    logger.error('outlook/disconnect: failed to delete token', { userId, err: tokenErr.message });
    return apiErr('Failed to disconnect Outlook. Please try again.', 500);
  }

  // Remove synced Outlook emails for this user
  const { error: emailErr } = await supabase
    .from('synced_emails')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'outlook');

  if (emailErr) {
    logger.warn('outlook/disconnect: could not remove synced emails', { userId, err: emailErr.message });
  }

  logger.info('outlook/disconnect: disconnected', { userId });
  return apiOk({ success: true });
});
