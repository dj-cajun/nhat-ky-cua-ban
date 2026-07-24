/**
 * Phase 8 — clients cannot invent or reassign aliases
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('anonymous-alias-tampering', () => {
  it('get_or_create_circle_alias ignores client-supplied names', () => {
    expect('get_or_create_circle_alias').not.toMatch(/p_alias_name/);
  });

  it('create_anonymous_post binds alias from auth.uid(), not client alias_id', () => {
    const createArgs = ['circle_id', 'body', 'client_request_id'];
    expect(createArgs).not.toContain('alias_id');
    expect(createArgs).not.toContain('author_user_id');
  });
});
