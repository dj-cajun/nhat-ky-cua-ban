/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  formatHintShield,
  hashHintField,
  parseHintSeal,
  sealHintData,
  verifyHintField,
} from '@/lib/hint-crypto';
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

  it('seals hint data without storing raw values', async () => {
    const sealed = await sealHintData(sampleHint, 'Nguyễn');
    expect(sealed).not.toContain('female');
    expect(sealed).not.toContain('170-175');

    const parsed = parseHintSeal(sealed);
    expect(parsed?.v).toBe(1);
    expect(parsed?.shields.height).toContain('170');
    expect(parsed?.shields.surname).toBe('Họ: Nguyễn');
  });

  it('verifies hashed hint fields', async () => {
    const digest = await hashHintField('gender', 'female');
    expect(await verifyHintField('gender', 'female', digest)).toBe(true);
    expect(await verifyHintField('gender', 'male', digest)).toBe(false);
  });

  it('formats hint shield labels', () => {
    expect(formatHintShield('surname', sampleHint, 'Nguyễn')).toBe('Họ: Nguyễn');
    expect(formatHintShield('height', sampleHint, 'Nguyễn')).toContain('170');
    expect(formatHintShield('commute', sampleHint, 'Nguyễn')).toContain('Xe máy');
  });
});
