/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { buyHintUnlock, buySurnameLetter, getBalance, sendDotoriGift } from '@/lib/dotori-economy';
import * as localDb from '@/lib/local-db';

describe('dotori-economy', () => {
  beforeEach(async () => {
    localStorage.clear();
    await localDb.initLocalDb('test', 'Nguyễn Test', 'THPT Marie Curie', 'Lớp 11A', '{}');
    localDb.updateProfile({ dotoriBalance: 10 });
  });

  it('spends dotori for surname letter', () => {
    const result = buySurnameLetter('cm-1', 'Trần');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.letter).toBe('T');
      expect(getBalance()).toBe(8);
    }
  });

  it('rejects insufficient balance', () => {
    localDb.updateProfile({ dotoriBalance: 1 });
    const result = buySurnameLetter('cm-1', 'Trần');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient');
  });

  it('unlocks hint shield', () => {
    const result = buyHintUnlock('cm-1', 'Trần');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBeTruthy();
  });

  it('sends dotori gift', () => {
    const result = sendDotoriGift('cm-2', 3, 'hi');
    expect(result.ok).toBe(true);
    if (result.ok) expect(getBalance()).toBe(7);
  });
});
