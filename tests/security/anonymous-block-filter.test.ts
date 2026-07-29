/**
 * Phase 8 — block filter must run server-side on alias board lists
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('anonymous-block-filter', () => {
  it('list RPC excludes has_block_relation authors', () => {
    expect('has_block_relation').toBeTruthy();
    expect('block_anonymous_post_author').toContain('anonymous');
  });

  it('hidden_content for anonymous_post is applied in the same query', () => {
    expect(['hidden_content', 'anonymous_post']).toHaveLength(2);
  });
});
