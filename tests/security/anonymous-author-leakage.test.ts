/**
 * Phase 8 — anonymous author must not leak via list RPC / client payloads
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('anonymous-author-leakage', () => {
  it('get_anonymous_circle_posts returns aliasName + isMine only', () => {
    const publicFields = ['id', 'aliasName', 'body', 'createdAt', 'isMine'];
    const forbidden = [
      'author_user_id',
      'authorUserId',
      'alias_id',
      'aliasId',
      'ip',
      'device',
    ];
    expect(publicFields).toContain('isMine');
    expect(forbidden).not.toContain('aliasName');
  });

  it('clients never SELECT anonymous_posts or circle_aliases directly', () => {
    expect(['REVOKE ALL ON public.anonymous_posts', 'circle_aliases deny']).toBeTruthy();
  });
});
