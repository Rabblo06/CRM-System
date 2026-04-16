import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // OAuth / magic-link error
  if (error) {
    const params = new URLSearchParams({ auth_error: errorDescription || error });
    return NextResponse.redirect(`${origin}/login?${params}`);
  }

  if (code) {
    const response = NextResponse.redirect(`${origin}/dashboard`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      const params = new URLSearchParams({ auth_error: exchangeError.message });
      return NextResponse.redirect(`${origin}/login?${params}`);
    }

    // ── Password recovery flow ─────────────────────────────
    // The forgot-password email uses redirectTo=…/auth/callback?type=recovery
    const type = searchParams.get('type');
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/reset-password`, { headers: response.headers });
    }

    // ── Normal signup / OAuth login ────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    const isNewUser = user && !user.user_metadata?.onboarding_complete;
    const dest = isNewUser ? `${origin}/onboarding` : `${origin}/dashboard`;
    return NextResponse.redirect(dest, { headers: response.headers });
  }

  // No code at all → back to login
  return NextResponse.redirect(`${origin}/login`);
}
