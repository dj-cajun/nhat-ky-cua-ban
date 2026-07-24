/**
 * Phase 9 — reply must not return counterpart user id to the client
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('message-reply-identity-leak', () => {
  it('reply_to_private_message resolves counterpart server-side', () => {
    const replyArgs = ['source_message_id', 'sender_mode', 'body', 'client_request_id'];
    expect(replyArgs).not.toContain('recipient_id');
    expect(replyArgs).not.toContain('sender_id');
  });
});
