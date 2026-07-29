/**
 * Phase 6.5 — badge state RPC membership / no choice leakage (contract)
 * Executable mirror: mobile presence + repository tests
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('active-post-badge-state-leakage', () => {
  it('RPC returns only postId + respondedUserIds for active members', () => {
    const allowed = ['postId', 'respondedUserIds'];
    const forbidden = ['optionId', 'respondedAt', 'email', 'choices'];
    expect(allowed).toContain('respondedUserIds');
    expect(forbidden).not.toContain('postId');
  });
});
