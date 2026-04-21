import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiOk, apiErr, apiTooManyRequests, getClientIp, withRoute } from '@/lib/api-error';
import { apiLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const POST = withRoute(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rl = apiLimiter.check(ip);
  if (!rl.ok) return apiTooManyRequests(rl.retryAfter);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return apiErr('Unauthorized', 401);
  }

  const token = authHeader.slice(7);
  const supabase = adminClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    logger.warn('users/ensure: invalid token');
    return apiErr('Invalid token', 401);
  }

  await supabase.from('users').upsert(
    {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  logger.info('users/ensure: upserted user', { userId: user.id });
  return apiOk({ ok: true });
});
