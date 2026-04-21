import { NextRequest } from 'next/server';
import { pendingCodes } from '@/lib/phoneCodes';
import { apiOk, apiErr, apiTooManyRequests, getClientIp, withRoute } from '@/lib/api-error';
import { phoneLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const POST = withRoute(async (req: NextRequest) => {
  const ip = getClientIp(req);
  // Reuse the phone limiter to prevent brute-force code guessing
  const rl = phoneLimiter.check(`verify:${ip}`);
  if (!rl.ok) {
    logger.warn('Rate limit hit on phone/verify-code', { ip });
    return apiTooManyRequests(rl.retryAfter);
  }

  const body = await req.json().catch(() => ({})) as { phone?: string; code?: string };
  const { phone, code } = body;

  if (!phone || !code) {
    return apiErr('Phone and code are required', 400);
  }

  const entry = pendingCodes.get(phone);

  if (!entry) {
    return apiErr('No verification code found. Please request a new one.', 400);
  }

  if (Date.now() > entry.expiresAt) {
    pendingCodes.delete(phone);
    return apiErr('Code expired. Please request a new one.', 400);
  }

  if (entry.code !== String(code).trim()) {
    logger.warn('Incorrect verification code attempt', { phone: phone.slice(0, 6) + '****' });
    return apiErr('Incorrect code. Please try again.', 400);
  }

  pendingCodes.delete(phone);
  phoneLimiter.reset(`verify:${ip}`); // reset on success
  logger.info('Phone verification successful', { phone: phone.slice(0, 6) + '****' });
  return apiOk({ success: true });
});
