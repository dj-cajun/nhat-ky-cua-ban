/**
 * Profanity Shield Engine — 3단계 정규화 후 블랙리스트 비교
 * 1. Spacing/Dot 제거
 * 2. 베트남어 성조 기호 제거
 * 3. Leet Decode (0→o, 1→i 등)
 */

const VIETNAMESE_TONE_MAP: Record<string, string> = {
  à: 'a',
  á: 'a',
  ạ: 'a',
  ả: 'a',
  ã: 'a',
  â: 'a',
  ầ: 'a',
  ấ: 'a',
  ậ: 'a',
  ẩ: 'a',
  ẫ: 'a',
  ă: 'a',
  ằ: 'a',
  ắ: 'a',
  ặ: 'a',
  ẳ: 'a',
  ẵ: 'a',
  è: 'e',
  é: 'e',
  ẹ: 'e',
  ẻ: 'e',
  ẽ: 'e',
  ê: 'e',
  ề: 'e',
  ế: 'e',
  ệ: 'e',
  ể: 'e',
  ễ: 'e',
  ì: 'i',
  í: 'i',
  ị: 'i',
  ỉ: 'i',
  ĩ: 'i',
  ò: 'o',
  ó: 'o',
  ọ: 'o',
  ỏ: 'o',
  õ: 'o',
  ô: 'o',
  ồ: 'o',
  ố: 'o',
  ộ: 'o',
  ổ: 'o',
  ỗ: 'o',
  ơ: 'o',
  ờ: 'o',
  ớ: 'o',
  ợ: 'o',
  ở: 'o',
  ỡ: 'o',
  ù: 'u',
  ú: 'u',
  ụ: 'u',
  ủ: 'u',
  ũ: 'u',
  ư: 'u',
  ừ: 'u',
  ứ: 'u',
  ự: 'u',
  ử: 'u',
  ữ: 'u',
  ỳ: 'y',
  ý: 'y',
  ỵ: 'y',
  ỷ: 'y',
  ỹ: 'y',
  đ: 'd',
  À: 'a',
  Á: 'a',
  Ạ: 'a',
  Ả: 'a',
  Ã: 'a',
  Â: 'a',
  Ầ: 'a',
  Ấ: 'a',
  Ậ: 'a',
  Ẩ: 'a',
  Ẫ: 'a',
  Ă: 'a',
  Ằ: 'a',
  Ắ: 'a',
  Ặ: 'a',
  Ẳ: 'a',
  Ẵ: 'a',
  È: 'e',
  É: 'e',
  Ẹ: 'e',
  Ẻ: 'e',
  Ẽ: 'e',
  Ê: 'e',
  Ề: 'e',
  Ế: 'e',
  Ệ: 'e',
  Ể: 'e',
  Ễ: 'e',
  Ì: 'i',
  Í: 'i',
  Ị: 'i',
  Ỉ: 'i',
  Ĩ: 'i',
  Ò: 'o',
  Ó: 'o',
  Ọ: 'o',
  Ỏ: 'o',
  Õ: 'o',
  Ô: 'o',
  Ồ: 'o',
  Ố: 'o',
  Ộ: 'o',
  Ổ: 'o',
  Ỗ: 'o',
  Ơ: 'o',
  Ờ: 'o',
  Ớ: 'o',
  Ợ: 'o',
  Ở: 'o',
  Ỡ: 'o',
  Ù: 'u',
  Ú: 'u',
  Ụ: 'u',
  Ủ: 'u',
  Ũ: 'u',
  Ư: 'u',
  Ừ: 'u',
  Ứ: 'u',
  Ự: 'u',
  Ử: 'u',
  Ữ: 'u',
  Ỳ: 'y',
  Ý: 'y',
  Ỵ: 'y',
  Ỷ: 'y',
  Ỹ: 'y',
  Đ: 'd',
};

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
};

import { EXTRA_PROFANITY_WORDS } from '@/config/app-content';

/** 기본 블랙리스트 + 프리셋 추가 금지어 */
const DEFAULT_BLACKLIST = [
  'ditme',
  'dit',
  'lon',
  'cu',
  'dmm',
  'dm',
  'vl',
  'clgt',
  'cc',
  'shit',
  'fuck',
  'bitch',
  '씨발',
  '시발',
  '병신',
  '지랄',
  '개새',
  '좆',
  ...EXTRA_PROFANITY_WORDS,
];

export function removeSpacingAndDots(text: string): string {
  return text.replace(/[\s._\-*#@!?,;:'"()[\]{}|\\/<>]+/g, '');
}

export function removeVietnameseTones(text: string): string {
  return Array.from(text)
    .map((char) => VIETNAMESE_TONE_MAP[char] ?? char)
    .join('');
}

export function leetDecode(text: string): string {
  return Array.from(text)
    .map((char) => LEET_MAP[char] ?? char)
    .join('');
}

export function normalizeForProfanityCheck(text: string): string {
  const step1 = removeSpacingAndDots(text);
  const step2 = removeVietnameseTones(step1);
  const step3 = leetDecode(step2);
  return step3.toLowerCase();
}

export interface ProfanityCheckResult {
  blocked: boolean;
  normalized: string;
  matchedWord?: string;
}

export function checkProfanity(
  text: string,
  blacklist: string[] = DEFAULT_BLACKLIST,
): ProfanityCheckResult {
  const normalized = normalizeForProfanityCheck(text);

  for (const word of blacklist) {
    const normalizedWord = normalizeForProfanityCheck(word);
    if (normalized.includes(normalizedWord)) {
      return { blocked: true, normalized, matchedWord: word };
    }
  }

  return { blocked: false, normalized };
}

export function assertCleanText(
  text: string,
  blacklist?: string[],
): { ok: true } | { ok: false; message: string } {
  const result = checkProfanity(text, blacklist);
  if (result.blocked) {
    return { ok: false, message: '부적절한 표현이 포함되어 있습니다.' };
  }
  return { ok: true };
}
