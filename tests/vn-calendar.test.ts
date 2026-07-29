import { describe, expect, it } from 'vitest';
import {
  addDaysVN,
  fromDateKey,
  getDayOfWeekVN,
  getVNWeekFromSunday,
  toDateKey,
} from '@/lib/vn-calendar';

describe('vn-calendar', () => {
  it('주간이 CN(일요일)부터 7일', () => {
    const wed = fromDateKey('2026-07-02');
    const week = getVNWeekFromSunday(wed);

    expect(week).toHaveLength(7);
    expect(toDateKey(week[0])).toBe('2026-06-28');
    expect(toDateKey(week[6])).toBe('2026-07-04');
    expect(getDayOfWeekVN(week[0])).toBe(0);
    expect(getDayOfWeekVN(week[6])).toBe(6);
  });

  it('월 경계를 넘어도 날짜가 연속', () => {
    const last = addDaysVN(fromDateKey('2026-07-31'), 0);
    const next = addDaysVN(last, 1);
    expect(toDateKey(next)).toBe('2026-08-01');
  });
});
