/**
 * Centralised API response helpers.
 *
 * Rules:
 *  - apiOk  → always returns 2xx JSON
 *  - apiErr → always returns safe { error } JSON, NEVER exposes stack traces
 *  - withRoute → wraps a handler so unhandled throws become 500s, not blank responses
 *  - getClientIp → extracts the real client IP for rate-limit keying
 *  - getServerUserId → resolves the authenticated user from Bearer token or session cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { logger } from './logger';

/* ── Success response ──────────────────────────────────── */
export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/* ── Error response ────────────────────────────────────── */
export function apiErr(
  message: string,
  status = 500,
  code?: string,
): NextResponse {
  const body: Record<string, unknown> = { error: message };
  if (code) body.code = code;
  return NextResponse.json(body, { status });
}

/* ── Rate-limit helper: build a 429 response ───────────── */
export function apiTooManyRequests(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    },
  );
}

/* ── Client IP extraction ───────────────────────────────── */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/* ── Authenticated user resolution ─────────────────────── */
/**
 * Returns the verified user ID from either:
 *  1. Authorization: Bearer <token>  (fetch / XHR requests)
 *  2. Supabase session cookie         (EventSource / browser nav)
 * Returns null if unauthenticated.
 */
export async function getServerUserId(req: NextRequest): Promise<string | null> {
  // 1. Bearer token
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: { user } } = await admin.auth.getUser(auth.slice(7));
    if (user?.id) return user.id;
  }

  // 2. Session cookie (EventSource sends cookies automatically)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/* ── Route wrapper ──────────────────────────────────────── */
type Handler = (req: NextRequest, ctx: unknown) => Promise<NextResponse | Response>;

/**
 * Wraps a route handler in a top-level try-catch.
 * Any unhandled exception becomes a 500 with a safe message.
 * Stack traces are logged server-side but never sent to the client.
 */
export function withRoute(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('Unhandled route error', {
        path: req.nextUrl?.pathname,
        method: req.method,
        err: msg,
      });
      return apiErr('Internal server error');
    }
  };
}
