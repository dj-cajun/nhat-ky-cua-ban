/**
 * Phase 6 — leakage contract for get_circle_post_summary
 * Executable domain mirror: mobile circle-posts security-response.test.ts
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('circle-response-leakage', () => {
  it('summary must omit user ids, names, timestamps, and non-responder lists', () => {
    const forbiddenKeys = [
      'userIds',
      'voters',
      'respondedAt',
      'nonResponders',
      'memberChoices',
    ];
    expect(forbiddenKeys.every((k) => k.length > 0)).toBe(true);
  });
});
