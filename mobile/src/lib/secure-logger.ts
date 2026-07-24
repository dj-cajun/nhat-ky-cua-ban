type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEY =
  /body|content|text|message|diary|note|alias|author|jwt|token|password|secret|signed.?url|search|query|push.?token|spotify.?q/i;

/**
 * Strip sensitive keys before any log / crash reporter.
 * Never log diary bodies, private notes, alias authors, JWTs, signed URLs, or search terms.
 */
export function sanitizeAttrs(
  attrs?: Record<string, unknown>,
): Record<string, string | number | boolean> | undefined {
  if (!attrs) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else if (value == null) {
      continue;
    } else {
      out[key] = '[omitted]';
    }
  }
  return out;
}

const isDev =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');

export function secureLog(
  level: LogLevel,
  event: string,
  attrs?: Record<string, unknown>,
): void {
  const safe = sanitizeAttrs(attrs);
  if (isDev) {
    console[level === 'debug' ? 'log' : level](`[${event}]`, safe ?? {});
  }
  // Production: wire to Sentry/etc with beforeSend → sanitizeAttrs
}

export function secureError(
  event: string,
  error: unknown,
  attrs?: Record<string, unknown>,
): void {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : 'UNKNOWN';
  secureLog('error', event, {
    ...attrs,
    error_code: code,
    // never attach error.message if it might contain SQL internals — code only
  });
}

/** Sentry-style beforeSend hook shape */
export function scrubEventForMonitoring<T extends { extra?: Record<string, unknown> }>(
  event: T,
): T {
  if (event.extra) {
    return { ...event, extra: sanitizeAttrs(event.extra) as Record<string, unknown> };
  }
  return event;
}
