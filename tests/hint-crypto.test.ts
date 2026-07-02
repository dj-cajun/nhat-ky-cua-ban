/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { encryptHintData, decryptHintData, formatHintShield } from '@/lib/hint-crypto';
import type { HintData } from '@/types';

const sampleHint: HintData = {
  gender: 'female',
  heightRange: '170-175',
  mbtiPrefix: 'E',
  commute: 'motorbike',
};

describe('hint-crypto', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('encrypts and decrypts hint data', () => {
    const encrypted = encryptHintData(sampleHint);
    expect(encrypted).not.toContain('female');
    const decrypted = decryptHintData(encrypted);
    expect(decrypted).toEqual(sampleHint);
  });

  it('formats hint shield labels', () => {
    expect(formatHintShield('surname', sampleHint, 'Nguyễn')).toBe('Họ: Nguyễn');
    expect(formatHintShield('height', sampleHint, 'Nguyễn')).toContain('170');
    expect(formatHintShield('commute', sampleHint, 'Nguyễn')).toContain('오토바이');
  });
});
