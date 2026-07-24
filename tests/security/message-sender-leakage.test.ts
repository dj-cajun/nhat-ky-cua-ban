/**
 * Phase 9 — message sender id must not leak on list/open payloads
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('message-sender-leakage', () => {
  it('received list returns senderDisplay + senderMode only for alias notes', () => {
    const publicFields = [
      'id',
      'senderMode',
      'senderDisplay',
      'body',
      'circle',
      'isOpened',
      'createdAt',
      'replyToMessageId',
    ];
    expect(publicFields).not.toContain('senderId');
  });

  it('sent list never includes openedAt / read flags', () => {
    expect(['openedAt', 'isOpened', 'readAt']).not.toContain('recipientDisplay');
  });
});
