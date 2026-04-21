import { NextRequest } from 'next/server';
import { apiOk, apiErr, apiTooManyRequests, getClientIp } from '@/lib/api-error';
import { authLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/check-email
 * Body: { email: string }
 *
 * Returns:
 *   { exists: true,  emailConfirmed: boolean }  — user found
 *   { exists: false }                            — no account with that email
 *   { exists: null  }                            — service role key not set
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in env.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = authLimiter.check(ip);
  if (!rl.ok) {
    logger.warn('Rate limit hit on check-email', { ip });
    return apiTooManyRequests(rl.retryAfter);
  }

  try {
    const body = await request.json().catch(() => ({})) as { email?: string };
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return apiErr('email is required', 400);
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      logger.warn('SUPABASE_SERVICE_ROLE_KEY not configured — check-email degraded');
      return apiOk({ exists: null });
    }

    const res = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email.toLowerCase().trim())}`,
      {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      },
    );

    if (!res.ok) {
      logger.warn('Supabase admin users API returned non-OK', { status: res.status });
      return apiOk({ exists: null });
    }

    const data = await res.json() as {
      users?: Array<{ email: string; email_confirmed_at?: string | null }>;
    };

    const match = (data.users ?? []).find(
      u => u.email?.toLowerCase() === email.toLowerCase().trim(),
    );

    if (!match) return apiOk({ exists: false });

    logger.info('check-email: user found', { emailConfirmed: !!match.email_confirmed_at });
    return apiOk({ exists: true, emailConfirmed: !!match.email_confirmed_at });
  } catch {
    // Never leak internal errors
    return apiOk({ exists: null });
  }
}
