import { describe, expect, it } from 'vitest';
import {
  formatNoteRelativeTime,
  validatePrivateMessageBody,
} from '../private-message.validation';

describe('validatePrivateMessageBody', () => {
  it('accepts short plain text', () => {
    expect(() => validatePrivateMessageBody('Thanks for today')).not.toThrow();
  });

  it('rejects links, email, phone, mentions, spam', () => {
    expect(() => validatePrivateMessageBody('https://x.com')).toThrow(/Links/);
    expect(() => validatePrivateMessageBody('a@b.co')).toThrow(/Email/);
    expect(() => validatePrivateMessageBody('5551234567')).toThrow(/Phone/);
    expect(() => validatePrivateMessageBody('hey @maya')).toThrow(/Mentions/);
    expect(() => validatePrivateMessageBody('!!!!!!!!!!')).toThrow(/spammy/);
  });
});

describe('formatNoteRelativeTime', () => {
  it('uses coarse buckets', () => {
    const now = Date.parse('2026-07-24T12:00:00.000Z');
    expect(formatNoteRelativeTime('2026-07-24T11:58:00.000Z', now)).toBe('Just now');
    expect(formatNoteRelativeTime('2026-07-23T12:00:00.000Z', now)).toBe('Yesterday');
  });
});
