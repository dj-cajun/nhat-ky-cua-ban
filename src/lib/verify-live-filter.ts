import { assertCleanText } from '@/lib/profanity-shield';

/** 캘린더·쪽지 등 실시간 입력 비속어 검증 */
export function verifyTextCleanStatus(text: string): boolean {
  return assertCleanText(text).ok;
}
