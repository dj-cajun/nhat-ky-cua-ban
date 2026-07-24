/**
 * Automatic vs user-driven retry policy (phase 11).
 * Mutations that create durable side effects must NOT auto-retry.
 */

export type RetryKind = 'auto' | 'user' | 'none';

const AUTO_SAFE_OPS = new Set([
  'read',
  'presence_reconnect',
  'spotify_search',
  'signed_url_refresh',
  'feature_flags',
]);

const NO_AUTO_OPS = new Set([
  'private_note_send',
  'anonymous_post_create',
  'report_submit',
  'poll_vote',
  'notice_ack',
  'circle_join_recommend',
  'photo_upload_finalize',
  'diary_save',
  'block_user',
]);

export function retryKindFor(op: string): RetryKind {
  if (NO_AUTO_OPS.has(op)) return 'user';
  if (AUTO_SAFE_OPS.has(op)) return 'auto';
  return 'none';
}

export function shouldAutoRetry(op: string, attempt: number, maxAttempts = 3): boolean {
  if (retryKindFor(op) !== 'auto') return false;
  return attempt < maxAttempts;
}

/** Exponential backoff with jitter (ms). */
export function backoffMs(attempt: number, base = 400, cap = 8_000): number {
  const exp = Math.min(cap, base * 2 ** Math.max(0, attempt));
  const jitter = Math.floor(Math.random() * base);
  return exp + jitter;
}

export async function withAutoRetry<T>(
  op: string,
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!shouldAutoRetry(op, attempt + 1, maxAttempts)) break;
      await sleep(backoffMs(attempt));
    }
  }
  throw last;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
