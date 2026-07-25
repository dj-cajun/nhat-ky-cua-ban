import { LOGGED_IN_ZALO_USER } from '@/config/app-content';
import type { UserProfile } from '@/types';
import { getLoggedInZaloUser, extractSurname, isPlaceholderZaloName } from '@/lib/zalo-auth';
import { db } from '@/lib/db';

function pickValidName(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && !isPlaceholderZaloName(trimmed)) {
      return trimmed;
    }
  }
  return LOGGED_IN_ZALO_USER.name;
}

/** 프로필에 저장된 이름 우선, 없으면 Zalo 로그인 시 설정한 이름 */
export function getProfileDisplayName(profile: UserProfile): string {
  return pickValidName(profile.realName, getLoggedInZaloUser().name, profile.surname);
}

/** realName 이 비어 있거나 SDK placeholder면 Zalo/데모 이름으로 복구 */
export function ensureProfileName(profile: UserProfile): UserProfile {
  const name = getProfileDisplayName(profile);
  if (profile.realName?.trim() === name) {
    return profile;
  }

  const updated = db.updateProfile({
    realName: name,
    surname: extractSurname(name),
  });
  return updated ?? { ...profile, realName: name, surname: extractSurname(name) };
}
