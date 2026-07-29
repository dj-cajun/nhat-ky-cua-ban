import { describe, expect, it } from 'vitest';
import {
  formatAnonymousRelativeTime,
  validateAnonymousPostBody,
} from '../anonymous-board.validation';

describe('validateAnonymousPostBody', () => {
  it('accepts short plain text', () => {
    expect(() => validateAnonymousPostBody('Hello circle')).not.toThrow();
  });

  it('rejects links, email, phone, and spammy repeats', () => {
    expect(() => validateAnonymousPostBody('see https://evil.example')).toThrow(/Links/);
    expect(() => validateAnonymousPostBody('www.evil.example')).toThrow(/Links/);
    expect(() => validateAnonymousPostBody('hi me@mail.com')).toThrow(/Email/);
    expect(() => validateAnonymousPostBody('call 5551234567')).toThrow(/Phone/);
    expect(() => validateAnonymousPostBody('aaaaaaaaaaa')).toThrow(/spammy/);
  });

  it('rejects empty and overlong bodies', () => {
    expect(() => validateAnonymousPostBody('   ')).toThrow(/1–300/);
    expect(() => validateAnonymousPostBody('x'.repeat(301))).toThrow(/1–300/);
  });
});

describe('formatAnonymousRelativeTime', () => {
  it('uses coarse buckets without second-level precision', () => {
    const now = Date.parse('2026-07-24T12:00:00.000Z');
    expect(formatAnonymousRelativeTime('2026-07-24T11:59:30.000Z', now)).toBe('Just now');
    expect(formatAnonymousRelativeTime('2026-07-24T11:50:00.000Z', now)).toBe('10 min ago');
    expect(formatAnonymousRelativeTime('2026-07-23T12:00:00.000Z', now)).toBe('Yesterday');
  });
});
