/**
 * In-memory sliding-window rate limiter.
 *
 * Uses a per-key counter that resets after windowMs milliseconds.
 * Works correctly for both single-process Node.js and Edge runtimes.
 * NOTE: In multi-instance deployments (multiple server pods) each
 *       instance maintains its own counter. For strict global limiting
 *       replace the Map with a Redis / Upstash client.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly store = new Map<string, Bucket>();

  constructor(options: { limit: number; windowMs: number }) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
  }

  /**
   * Checks whether `key` has exceeded the rate limit.
   * Returns { ok: true } if the request should proceed,
   * or { ok: false, retryAfter } (seconds) if it should be rejected.
   */
  check(key: string): { ok: boolean; retryAfter: number } {
    const now = Date.now();
    const bucket = this.store.get(key);

    if (!bucket || now >= bucket.resetAt) {
      // First request in this window (or window has expired)
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { ok: true, retryAfter: 0 };
    }

    if (bucket.count >= this.limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      return { ok: false, retryAfter };
    }

    bucket.count++;
    return { ok: true, retryAfter: 0 };
  }

  /** Resets the bucket for a given key (e.g. on successful auth). */
  reset(key: string) {
    this.store.delete(key);
  }
}

/* ─────────────────────────────────────────────────────────
   Pre-built limiters — import the one that matches the
   sensitivity of the endpoint you are protecting.
───────────────────────────────────────────────────────── */

/** Auth endpoints (login, check-email, OAuth start) — 10 req / 15 min */
export const authLimiter = new RateLimiter({ limit: 10, windowMs: 15 * 60_000 });

/** Phone verification — 3 send-code requests per hour (Twilio costs money) */
export const phoneLimiter = new RateLimiter({ limit: 3, windowMs: 60 * 60_000 });

/** Gmail send — 20 emails per hour per user (prevent spam) */
export const emailLimiter = new RateLimiter({ limit: 20, windowMs: 60 * 60_000 });

/** General API endpoints — 120 req / min per IP */
export const apiLimiter = new RateLimiter({ limit: 120, windowMs: 60_000 });

/** Internal cron endpoints — 10 req / min (client polling interval is 60 s) */
export const cronLimiter = new RateLimiter({ limit: 10, windowMs: 60_000 });
