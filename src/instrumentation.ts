/**
 * Next.js Instrumentation Hook — runs once when the server process starts.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * We use this to validate required environment variables before the server
 * starts accepting traffic. If any required var is missing the process exits
 * with a clear error message rather than failing silently at request time.
 */

export async function register() {
  // Only run in the Node.js runtime (not Edge) and only on the server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateStartupEnv } = await import('./lib/env');
    try {
      validateStartupEnv();
    } catch (err) {
      // Print the full message so operators can see exactly what is missing
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }
}
