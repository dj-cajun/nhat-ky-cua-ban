import type { HintShield } from '@/types';
import { getClassmates } from '@/lib/local-db';
import { VOTE_QUESTIONS } from '@/lib/seed-data';
import { vi } from '@/i18n/vi';

export interface VoteQuestion {
  index: number;
  text: string;
  options: { id: string; name: string }[];
}

/** 4지선다 실명 옵션 무작위 생성 */
export function generateVoteQuestions(): VoteQuestion[] {
  const classmates = getClassmates();

  return VOTE_QUESTIONS.map((text, i) => {
    const shuffled = [...classmates].sort(() => Math.random() - 0.5);
    const options = shuffled.slice(0, 4).map((c) => ({ id: c.id, name: c.realName }));
    return { index: i + 1, text, options };
  });
}

export const HINT_SHIELD_OPTIONS: { value: HintShield; label: string }[] = [
  { value: 'surname', label: vi.hintShield.surname },
  { value: 'height', label: vi.hintShield.height },
  { value: 'gender', label: vi.hintShield.gender },
  { value: 'commute', label: vi.hintShield.commute },
];

/** 베트남 시간 17:00~17:59 여부 */
export function isVoteHourVN(): boolean {
  const now = new Date();
  const vnHour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: 'numeric',
    hour12: false,
  }).format(now);
  return parseInt(vnHour, 10) === 17;
}

/** 21:00 지목 알림 시간 */
export function isNotificationHourVN(): boolean {
  const now = new Date();
  const vnHour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: 'numeric',
    hour12: false,
  }).format(now);
  return parseInt(vnHour, 10) === 21;
}

export function todayDateStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}
