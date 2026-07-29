import { CLASSMATES_SEED } from '@/config/app-content';
import { formatHintShield, parseHintSeal } from '@/lib/hint-crypto';
import * as localDb from '@/lib/local-db';
import { db } from '@/lib/db';
import type { HintData, HintShield } from '@/types';

const ALL_SHIELDS: HintShield[] = ['surname', 'height', 'gender', 'commute'];

export function purchaseKey(
  reason: 'surname_letter' | 'hint_unlock',
  targetId: string,
  shield?: HintShield,
): string {
  if (reason === 'surname_letter') return `surname_letter:${targetId}`;
  return `hint_unlock:${targetId}:${shield ?? ''}`;
}

/** 대상 유저의 공개 가능한 힌트 실드 문구 목록 */
export function getTargetHintShields(userId: string, surname: string): Record<HintShield, string> {
  const remoteSeal = localDb.getClassmateHintEncrypted(userId);
  if (remoteSeal) {
    const parsed = parseHintSeal(remoteSeal);
    if (parsed?.shields) {
      return parsed.shields as Record<HintShield, string>;
    }
  }

  const classmate = CLASSMATES_SEED.find((c) => c.id === userId);
  if (classmate?.hint) {
    return shieldsFromHint(classmate.hint, classmate.surname);
  }

  const profile = db.getProfile();
  if (userId === profile?.id && profile.hintEncrypted) {
    const seal = parseHintSeal(profile.hintEncrypted);
    if (seal?.shields) {
      return seal.shields as Record<HintShield, string>;
    }
  }

  return {
    surname: `Họ: ${surname}`,
    height: '???',
    gender: '???',
    commute: '???',
  };
}

function shieldsFromHint(hint: HintData, surname: string): Record<HintShield, string> {
  return {
    surname: formatHintShield('surname', hint, surname),
    height: formatHintShield('height', hint, surname),
    gender: formatHintShield('gender', hint, surname),
    commute: formatHintShield('commute', hint, surname),
  };
}

export function getUnlockedShieldsForTarget(userId: string): HintShield[] {
  return ALL_SHIELDS.filter((shield) =>
    db.hasDotoriPurchase(purchaseKey('hint_unlock', userId, shield)),
  );
}

export { ALL_SHIELDS };
