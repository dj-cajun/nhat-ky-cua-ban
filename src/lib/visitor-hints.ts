import { CLASSMATES_SEED } from '@/config/app-content';
import { formatHintShield } from '@/lib/hint-crypto';
import type { HintShield } from '@/types';

const SHIELD_ROTATION: HintShield[] = ['height', 'commute', 'gender', 'surname'];

/** 방문자별 공개 힌트 1줄 (쉴드 로테이션) */
export function getVisitorHintText(visitorId: string, surname: string): string {
  const seed = CLASSMATES_SEED.find((c) => c.id === visitorId);
  if (!seed?.hint) return `Họ: ${surname}`;

  const shield = SHIELD_ROTATION[visitorId.length % SHIELD_ROTATION.length];
  return formatHintShield(shield, seed.hint, seed.surname);
}
