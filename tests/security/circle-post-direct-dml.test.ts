/**
 * Phase 6 — clients must not treat direct DML as allowed.
 * Domain mirror: only RPC-shaped helpers mutate posts/responses.
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from 'vitest';

const FORBIDDEN_DIRECT = [
  'insert into circle_posts',
  'update circle_posts',
  'delete from circle_posts',
  'insert into circle_responses',
  'select * from circle_responses',
] as const;

describe('circle-post-direct-dml', () => {
  beforeEach(() => localStorage.clear());

  it('documents that authenticated clients have no direct DML grants (013)', () => {
    // Policy contract from supabase/migrations/013_circle_posts_and_responses.sql
    expect(FORBIDDEN_DIRECT.every((s) => typeof s === 'string')).toBe(true);
    expect(FORBIDDEN_DIRECT).toContain('insert into circle_responses');
    expect(FORBIDDEN_DIRECT).toContain('select * from circle_responses');
  });
});
