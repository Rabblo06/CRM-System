import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEMO_MODE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder_anon_key';

/** Routes that require an authenticated session */
const PROTECTED = [
  '/dashboard',
  '/contacts',
  '/companies',
  '/deals',
  '/tasks',
  '/activities',
  '/meetings',
  '/emails',
  '/import',
  '/settings',
  '/onboarding',
  '/calls',
  '/inbox',
  '/orders',
  '/segments',
  '/tickets',
  '/message-templates',
];

/** Routes only accessible when NOT signed in (redirect to /dashboard if signed in) */
const AUTH_ONLY = ['/login'];

/**
 * Routes that are always public — accessible regardless of session state.
 * /reset-password is reached via the password-reset email link and requires
 * a fresh recovery session, but must not be blocked by the middleware check.
 */
const PUBLIC_ALWAYS = ['/reset-password', '/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Demo mode: skip all auth checks
  if (DEMO_MODE) return NextResponse.next();

  // Always-public routes: pass through immediately
  if (PUBLIC_ALWAYS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isAuthOnly  = AUTH_ONLY.some(p => pathname.startsWith(p));

  // Not signed in → redirect to /login
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Already signed in → skip login, send to dashboard
  if (user && isAuthOnly) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
