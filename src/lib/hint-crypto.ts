import type { HintData, HintShield } from '@/types';

const STORAGE_KEY = 'diary_hint_key';

function getOrCreateKey(): string {
  let key = localStorage.getItem(STORAGE_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, key);
  }
  return key;
}

/** 힌트 데이터 암호화 (로컬 XOR + base64 — 프로덕션은 서버 AES 권장) */
export function encryptHintData(data: HintData): string {
  const key = getOrCreateKey();
  const json = JSON.stringify(data);
  const encoded = Array.from(json)
    .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join('');
  return btoa(unescape(encodeURIComponent(encoded)));
}

export function decryptHintData(encrypted: string): HintData | null {
  try {
    const key = getOrCreateKey();
    const encoded = decodeURIComponent(escape(atob(encrypted)));
    const json = Array.from(encoded)
      .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
      .join('');
    return JSON.parse(json) as HintData;
  } catch {
    return null;
  }
}

export function formatHintShield(
  shield: HintShield,
  hint: HintData,
  surname: string,
): string {
  switch (shield) {
    case 'surname':
      return `Họ: ${surname}`;
    case 'height':
      return `키 ${hint.heightRange.replace('-', '~')}cm`;
    case 'gender':
      return hint.gender === 'male' ? '성별: 남' : hint.gender === 'female' ? '성별: 여' : '성별: 기타';
    case 'commute': {
      const labels: Record<HintData['commute'], string> = {
        motorbike: '오토바이',
        bicycle: '자전거',
        walk: '도보',
        bus: '버스',
        other: '기타',
      };
      return `등교: ${labels[hint.commute]}`;
    }
    default:
      return '힌트 없음';
  }
}
