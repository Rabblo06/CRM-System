import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/check-email
 * Body: { email: string }
 *
 * Returns:
 *   { exists: true,  emailConfirmed: boolean }  — user found
 *   { exists: false }                            — no account with that email
 *   { exists: null  }                            — service role key not set; caller shows generic error
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in env.
 * This key is SERVER-ONLY (never prefixed NEXT_PUBLIC_).
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json() as { email?: string };

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email required' }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      // Key not configured — tell the client to show a generic error message
      return NextResponse.json({ exists: null });
    }

    // Use the Supabase Admin REST API directly (no SDK type issues)
    const res = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email.toLowerCase().trim())}`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        },
      },
    );

    if (!res.ok) {
      return NextResponse.json({ exists: null });
    }

    const data = await res.json() as { users?: Array<{ email: string; email_confirmed_at?: string | null }> };
    const users = data.users ?? [];

    const match = users.find(
      u => u.email?.toLowerCase() === email.toLowerCase().trim(),
    );

    if (!match) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      emailConfirmed: !!match.email_confirmed_at,
    });
  } catch {
    // Never leak internal errors to the client
    return NextResponse.json({ exists: null });
  }
}
