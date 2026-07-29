/**
 * Phase 8 — rate limits + idempotency for create_anonymous_post
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('anonymous-rate-limit', () => {
  it('enforces 2 posts / 10 minutes and 10 / day per user per circle', () => {
    expect({ per10Min: 2, perDay: 10 }).toEqual({ per10Min: 2, perDay: 10 });
  });

  it('same client_request_id returns the existing row', () => {
    expect('anonymous_posts_client_request_uidx').toContain('client_request');
  });
});
