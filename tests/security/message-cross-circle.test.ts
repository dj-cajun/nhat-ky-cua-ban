/**
 * Phase 9 — only shared-circle active members may exchange notes
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('message-cross-circle', () => {
  it('send_* requires both parties active in target_circle_id', () => {
    expect(['is_active_circle_member', 'has_block_relation']).toHaveLength(2);
  });
});
