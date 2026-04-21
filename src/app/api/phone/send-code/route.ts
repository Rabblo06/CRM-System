import { NextRequest } from 'next/server';
import { pendingCodes } from '@/lib/phoneCodes';
import { apiOk, apiErr, apiTooManyRequests, getClientIp, withRoute } from '@/lib/api-error';
import { phoneLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { requireTwilioCredentials } from '@/lib/env';

export const POST = withRoute(async (req: NextRequest) => {
  const ip = getClientIp(req);
  const rl = phoneLimiter.check(ip);
  if (!rl.ok) {
    logger.warn('Rate limit hit on phone/send-code', { ip });
    return apiTooManyRequests(rl.retryAfter);
  }

  const body = await req.json().catch(() => ({})) as { phone?: string };
  const { phone } = body;

  if (!phone || typeof phone !== 'string') {
    return apiErr('Phone number is required', 400);
  }

  let creds: ReturnType<typeof requireTwilioCredentials>;
  try {
    creds = requireTwilioCredentials();
  } catch {
    logger.warn('Twilio not configured — phone verification unavailable');
    return apiErr('SMS verification is not configured on this server', 503);
  }

  // Generate a 6-digit code, valid for 10 minutes
  const code = String(Math.floor(100_000 + Math.random() * 900_000));
  pendingCodes.set(phone, { code, expiresAt: Date.now() + 10 * 60_000 });

  const formBody = new URLSearchParams({
    To:   phone,
    From: creds.phoneNumber,
    Body: `Your CRM verification code is: ${code}. Valid for 10 minutes.`,
  });

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64')}`,
      },
      body: formBody.toString(),
    },
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { message?: string };
    logger.error('Twilio SMS send failed', { status: resp.status, msg: err.message });
    return apiErr('Failed to send verification code', 502);
  }

  logger.info('SMS verification code sent', { phone: phone.slice(0, 6) + '****' });
  return apiOk({ success: true });
});
