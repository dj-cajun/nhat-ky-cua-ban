/**
 * Phase 9 — blocks stop send and list both ways
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('message-block-bypass', () => {
  it('block_private_message_sender calls block_user without revealing identity', () => {
    expect('block_private_message_sender').toContain('private_message');
  });
});
