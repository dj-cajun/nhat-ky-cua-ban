import {
  canEnterClassHome,
  claimFounding,
  getFounding,
  getFoundingByInviteToken,
  isFoundingMember,
} from '@/lib/class-founding';
import type { ClassFoundingRecord } from '@/types/founding';

export type FoundingRoute =
  | { stage: 'home' }
  | { stage: 'claim' }
  | { stage: 'pending'; record: ClassFoundingRecord }
  | { stage: 'forming'; record: ClassFoundingRecord }
  | { stage: 'waiting'; record: ClassFoundingRecord }
  | { stage: 'gate'; record: ClassFoundingRecord };

export function resolveFoundingRoute(
  schoolName: string,
  className: string,
  userId: string,
): FoundingRoute {
  if (canEnterClassHome(schoolName, className, userId)) {
    return { stage: 'home' };
  }

  const record = getFounding(schoolName, className);

  if (!record || record.status === 'expired') {
    return { stage: 'claim' };
  }

  if (record.status === 'pending') {
    return isFoundingMember(record, userId)
      ? { stage: 'pending', record }
      : { stage: 'waiting', record };
  }

  if (record.status === 'forming') {
    return isFoundingMember(record, userId)
      ? { stage: 'forming', record }
      : { stage: 'waiting', record };
  }

  if (record.status === 'active') {
    return { stage: 'gate', record };
  }

  return { stage: 'claim' };
}

export function bootstrapFounding(
  schoolName: string,
  className: string,
  userId: string,
  userName: string,
): ClassFoundingRecord | null {
  const route = resolveFoundingRoute(schoolName, className, userId);
  if (route.stage === 'claim') {
    const result = claimFounding(schoolName, className, userId, userName);
    return result.ok ? result.record : getFounding(schoolName, className);
  }
  if ('record' in route) {
    return route.record;
  }
  return getFounding(schoolName, className);
}

export function getOnboardingPrefillFromToken(
  token: string | null,
): { schoolName: string; className: string } | null {
  if (!token) return null;
  const record = getFoundingByInviteToken(token);
  if (!record) return null;
  return { schoolName: record.schoolName, className: record.className };
}
