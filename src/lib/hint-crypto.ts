import type { HintData, HintShield } from '@/types';
import { getMessages } from '@/i18n';

const HINT_PEPPER =
  import.meta.env.VITE_HINT_PEPPER ?? 'nhat-ky-hint-pepper-v1-local-only';

const LEGACY_KEY = 'diary_hint_key';

export interface HintSealV1 {
  v: 1;
  digest: Record<keyof HintData, string>;
  shields: Record<HintShield, string>;
}

function getLegacyXorKey(): string {
  let key = localStorage.getItem(LEGACY_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(LEGACY_KEY, key);
  }
  return key;
}

/** @deprecated XOR — 기존 로컬 데이터 마이그레이션 전용 */
function decryptHintDataLegacy(encrypted: string): HintData | null {
  try {
    const key = getLegacyXorKey();
    const encoded = decodeURIComponent(escape(atob(encrypted)));
    const json = Array.from(encoded)
      .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
      .join('');
    return JSON.parse(json) as HintData;
  } catch {
    return null;
  }
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeHintField(field: keyof HintData, value: string): string {
  return `${field}:${value.trim().toLowerCase()}`;
}

export async function hashHintField(
  field: keyof HintData,
  value: string,
): Promise<string> {
  return sha256Hex(`${HINT_PEPPER}|${normalizeHintField(field, value)}`);
}

export function formatHintShield(
  shield: HintShield,
  hint: HintData,
  surname: string,
): string {
  switch (shield) {
    case 'surname':
      return `${getMessages().hintShield.surname}: ${surname}`;
    case 'height':
      return getMessages().hintFormat.height(hint.heightRange);
    case 'gender':
      return hint.gender === 'male'
        ? getMessages().hintFormat.genderMale
        : hint.gender === 'female'
          ? getMessages().hintFormat.genderFemale
          : getMessages().hintFormat.genderOther;
    case 'commute': {
      const labels: Record<HintData['commute'], string> = {
        motorbike: getMessages().hintFormat.commuteMotorbike,
        bicycle: getMessages().hintFormat.commuteBicycle,
        walk: getMessages().hintFormat.commuteWalk,
        bus: getMessages().hintFormat.commuteBus,
        other: getMessages().hintFormat.commuteOther,
      };
      return getMessages().hintFormat.commute(labels[hint.commute]);
    }
    default:
      return getMessages().hintFormat.none;
  }
}

/** 온보딩 제출: 원본 HintData는 호출 직후 폐기, DB에는 해시+공개 쉴드 문구만 저장 */
export async function sealHintData(
  hint: HintData,
  surname: string,
): Promise<string> {
  const digest: HintSealV1['digest'] = {
    gender: await hashHintField('gender', hint.gender),
    heightRange: await hashHintField('heightRange', hint.heightRange),
    mbtiPrefix: await hashHintField('mbtiPrefix', hint.mbtiPrefix),
    commute: await hashHintField('commute', hint.commute),
  };

  const shields: HintSealV1['shields'] = {
    surname: formatHintShield('surname', hint, surname),
    height: formatHintShield('height', hint, surname),
    gender: formatHintShield('gender', hint, surname),
    commute: formatHintShield('commute', hint, surname),
  };

  return JSON.stringify({ v: 1, digest, shields } satisfies HintSealV1);
}

export function parseHintSeal(stored: string): HintSealV1 | null {
  try {
    const parsed = JSON.parse(stored) as Partial<HintSealV1>;
    if (parsed.v !== 1 || !parsed.digest || !parsed.shields) {
      return null;
    }
    return parsed as HintSealV1;
  } catch {
    return null;
  }
}

export function getShieldLabel(seal: HintSealV1, shield: HintShield): string {
  return seal.shields[shield];
}

export async function verifyHintField(
  field: keyof HintData,
  value: string,
  digest: string,
): Promise<boolean> {
  const next = await hashHintField(field, value);
  return next === digest;
}

/** XOR 레거시 → SHA-256 봉인으로 승격 */
export async function migrateLegacyHintSeal(
  stored: string,
  surname: string,
): Promise<string | null> {
  const existing = parseHintSeal(stored);
  if (existing) return stored;

  const legacy = decryptHintDataLegacy(stored);
  if (!legacy) return null;

  return sealHintData(legacy, surname);
}
