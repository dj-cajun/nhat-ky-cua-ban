import { LOGGED_IN_ZALO_USER, type LoggedInUserConfig } from '@/config/app-content';
import { getZaloSessionKey } from '@/lib/session';

export type ZaloUser = LoggedInUserConfig;

function readSession(): ZaloUser | null {
  try {
    const raw = localStorage.getItem(getZaloSessionKey());
    return raw ? (JSON.parse(raw) as ZaloUser) : null;
  } catch {
    return null;
  }
}

function saveSession(user: ZaloUser): void {
  localStorage.setItem(getZaloSessionKey(), JSON.stringify(user));
}

export function isZaloLoggedIn(): boolean {
  return readSession() !== null;
}

/**
 * Zalo 미니앱: getUserInfo()
 * 로컬 브라우저: 데모 Zalo 유저로 로그인
 */
export async function loginWithZalo(): Promise<ZaloUser> {
  try {
    const { getUserInfo } = await import('zmp-sdk/apis');
    const { userInfo } = await getUserInfo({ avatarType: 'normal' });
    const user: ZaloUser = {
      id: String(userInfo.id),
      name: userInfo.name,
      avatar: userInfo.avatar,
    };
    saveSession(user);
    return user;
  } catch {
    const user: ZaloUser = { ...LOGGED_IN_ZALO_USER };
    saveSession(user);
    return user;
  }
}

export function getLoggedInZaloUser(): ZaloUser {
  return readSession() ?? LOGGED_IN_ZALO_USER;
}

export function logoutZalo(): void {
  localStorage.removeItem(getZaloSessionKey());
}

/** @deprecated loginWithZalo() 사용 */
export async function getZaloUser(): Promise<ZaloUser> {
  if (isZaloLoggedIn()) {
    return getLoggedInZaloUser();
  }
  return loginWithZalo();
}

export function extractSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? fullName;
}
