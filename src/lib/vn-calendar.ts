const VN_TZ = 'America/New_York';

export interface VNDate {
  year: number;
  month: number;
  day: number;
}

/** 베트남 시간대 기준 오늘 */
export function getTodayVN(): VNDate {
  const iso = new Date().toLocaleDateString('en-CA', { timeZone: VN_TZ });
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

export function toDateKey(date: VNDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

export function fromDateKey(key: string): VNDate {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

/** 0=CN(일) … 6=T7(토) */
export function getDayOfWeekVN(date: VNDate): number {
  return new Date(date.year, date.month - 1, date.day).getDay();
}

export function addDaysVN(date: VNDate, delta: number): VNDate {
  const next = new Date(date.year, date.month - 1, date.day + delta);
  return {
    year: next.getFullYear(),
    month: next.getMonth() + 1,
    day: next.getDate(),
  };
}

/**
 * 베트남 주간 달력: CN(Chủ Nhật)부터 7일
 * vi.calendarDays 순서와 동일 — ['CN','T2','T3','T4','T5','T6','T7']
 */
export function getVNWeekFromSunday(anchor: VNDate = getTodayVN()): VNDate[] {
  const sunday = addDaysVN(anchor, -getDayOfWeekVN(anchor));
  return Array.from({ length: 7 }, (_, i) => addDaysVN(sunday, i));
}

export function isSameVNDate(a: VNDate, b: VNDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}
