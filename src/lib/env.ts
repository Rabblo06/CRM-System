/**
 * Environment variable validation.
 *
 * Exports:
 *   validateStartupEnv() — call this once at server startup (see src/instrumentation.ts)
 *                          Throws a descriptive Error if a REQUIRED var is missing.
 *
 *   requireGoogleCredentials()  — throws if Google OAuth vars are absent
 *   requireTwilioCredentials()  — throws if Twilio vars are absent
 *   requireServiceRoleKey()     — throws if Supabase service-role key is absent
 *
 * The functions above are for FEATURE-GATED checks inside individual API routes.
 * The startup check covers the vars that every API route depends on.
 *
 * IMPORTANT: This module must only be imported by server-side code (API routes,
 *            instrumentation.ts). Never import it in client components.
 */

import { logger } from './logger';

function requireVar(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `[env] Required environment variable "${name}" is missing or empty.\n` +
      `Add it to .env.local (local dev) or your deployment environment.\n` +
      `The server cannot start without it.`,
    );
  }
  return value;
}

function optionalVar(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v : undefined;
}

/**
 * Validates the environment variables that every API route depends on.
 * Call this from src/instrumentation.ts so it runs once at server startup.
 * A missing required var throws immediately — fail fast before accepting traffic.
 */
export function validateStartupEnv(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CRON_SECRET',
  ];

  const missing: string[] = [];
  for (const name of required) {
    const val = process.env[name];
    if (!val || val.trim() === '') {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    const list = missing.map(n => `  • ${n}`).join('\n');
    throw new Error(
      `[env] Server startup aborted. The following required environment variables are missing:\n` +
      `${list}\n\n` +
      `Add them to .env.local (development) or your hosting platform (production).`,
    );
  }

  // Warn about optional but strongly-recommended vars
  const optional: Record<string, string> = {
    GOOGLE_CLIENT_ID:      'Gmail + Calendar OAuth will not work',
    GOOGLE_CLIENT_SECRET:  'Gmail + Calendar OAuth will not work',
    TWILIO_ACCOUNT_SID:    'Phone verification will not work',
    TWILIO_AUTH_TOKEN:     'Phone verification will not work',
    TWILIO_PHONE_NUMBER:   'Phone verification will not work',
  };

  for (const [name, consequence] of Object.entries(optional)) {
    if (!optionalVar(name)) {
      logger.warn(`[env] Optional env var "${name}" is not set — ${consequence}`);
    }
  }

  logger.info('[env] Environment validation passed');
}

/* ── Feature-gated env helpers ──────────────────────────── */

export function requireServiceRoleKey(): string {
  return requireVar('SUPABASE_SERVICE_ROLE_KEY');
}

export function requireGoogleCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  return {
    clientId:     requireVar('GOOGLE_CLIENT_ID'),
    clientSecret: requireVar('GOOGLE_CLIENT_SECRET'),
  };
}

export function requireTwilioCredentials(): {
  accountSid:  string;
  authToken:   string;
  phoneNumber: string;
} {
  return {
    accountSid:  requireVar('TWILIO_ACCOUNT_SID'),
    authToken:   requireVar('TWILIO_AUTH_TOKEN'),
    phoneNumber: requireVar('TWILIO_PHONE_NUMBER'),
  };
}
