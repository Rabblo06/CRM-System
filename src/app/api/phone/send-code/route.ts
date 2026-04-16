import { NextRequest, NextResponse } from 'next/server';
import { pendingCodes } from '@/lib/phoneCodes';

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    return NextResponse.json({ error: 'SMS not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env.local' }, { status: 500 });
  }

  // Generate 6-digit code, valid for 10 minutes
  const code = String(Math.floor(100000 + Math.random() * 900000));
  pendingCodes.set(phone, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

  const body = new URLSearchParams({
    To:   phone,
    From: from,
    Body: `Your CRM verification code is: ${code}. Valid for 10 minutes.`,
  });

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: body.toString(),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    return NextResponse.json({ error: (err as { message?: string }).message || 'Failed to send SMS' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
