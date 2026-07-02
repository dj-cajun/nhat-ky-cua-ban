import { describe, expect, it } from 'vitest';
import {
  assertCleanText,
  checkProfanity,
  leetDecode,
  normalizeForProfanityCheck,
  removeSpacingAndDots,
  removeVietnameseTones,
} from '@/lib/profanity-shield';

describe('removeSpacingAndDots', () => {
  it('removes spaces and special characters', () => {
    expect(removeSpacingAndDots('đ_í_t m_ẹ')).toBe('đítmẹ');
  });
});

describe('removeVietnameseTones', () => {
  it('strips tone marks from Vietnamese', () => {
    expect(removeVietnameseTones('đítmẹ')).toBe('ditme');
  });
});

describe('leetDecode', () => {
  it('decodes common leet speak', () => {
    expect(leetDecode('l0n')).toBe('lon');
  });
});

describe('normalizeForProfanityCheck', () => {
  it('applies full 3-step pipeline', () => {
    expect(normalizeForProfanityCheck('đ_í_t m_ẹ')).toBe('ditme');
    expect(normalizeForProfanityCheck('l0n')).toBe('lon');
  });
});

describe('assertCleanText', () => {
  it('returns ok for clean text', () => {
    expect(assertCleanText('Xin chào')).toEqual({ ok: true });
  });

  it('returns error for blocked text', () => {
    const result = assertCleanText('l0n');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('không phù hợp');
    }
  });
});

describe('checkProfanity', () => {
  it('blocks Vietnamese profanity with obfuscation', () => {
    const result = checkProfanity('đ_í_t m_ẹ');
    expect(result.blocked).toBe(true);
  });

  it('blocks leet-encoded words', () => {
    const result = checkProfanity('l0n');
    expect(result.blocked).toBe(true);
  });

  it('allows clean text', () => {
    const result = checkProfanity('오늘 날씨 좋다');
    expect(result.blocked).toBe(false);
  });

  it('blocks Korean profanity', () => {
    const result = checkProfanity('시발');
    expect(result.blocked).toBe(true);
  });
});
