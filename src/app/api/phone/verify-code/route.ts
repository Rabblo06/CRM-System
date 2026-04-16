import { NextRequest, NextResponse } from 'next/server';
import { pendingCodes } from '@/lib/phoneCodes';

export async function POST(req: NextRequest) {
  const { phone, code } = await req.json();
  if (!phone || !code) return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 });

  const entry = pendingCodes.get(phone);

  if (!entry) {
    return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
  }

  if (Date.now() > entry.expiresAt) {
    pendingCodes.delete(phone);
    return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 });
  }

  if (entry.code !== String(code).trim()) {
    return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 });
  }

  // Code is valid — clean up
  pendingCodes.delete(phone);
  return NextResponse.json({ success: true });
}
