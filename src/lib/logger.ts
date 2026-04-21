/**
 * Centralized structured logger.
 *
 * - All output is JSON with { ts, level, msg, ...ctx }
 * - Error objects are reduced to their .message — stack traces are NEVER emitted
 * - In production the lines are JSON; in development they are pretty-printed
 * - Import this wherever you need logging; never use console.log directly in routes/lib
 */

type Level = 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: Level;
  msg: string;
  [key: string]: unknown;
}

const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Recursively strips Error objects to just their message.
 * Prevents accidental stack-trace leakage in log output.
 */
function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v instanceof Error) {
      out[k] = v.message; // message only — never stack
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitize(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function emit(level: Level, msg: string, ctx?: Record<string, unknown>) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(ctx ? sanitize(ctx) : {}),
  };

  if (IS_DEV) {
    // Human-readable in development
    const prefix = `[${entry.ts}] [${level.toUpperCase()}]`;
    const rest = ctx ? ' ' + JSON.stringify(sanitize(ctx)) : '';
    const line = `${prefix} ${msg}${rest}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  } else {
    // Structured JSON in production
    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  }
}

export const logger = {
  info:  (msg: string, ctx?: Record<string, unknown>) => emit('info',  msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => emit('warn',  msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit('error', msg, ctx),
};
