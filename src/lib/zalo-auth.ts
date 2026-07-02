import { LOGGED_IN_ZALO_USER, type LoggedInUserConfig } from '@/config/app-content';
import { getZaloSessionKey } from '@/lib/session';

export type ZaloUser = LoggedInUserConfig;

const PLACEHOLDER_ZALO_NAMES = new Set(['user name', 'username', 'user', 'zalo user']);

/** localhost Zalo SDK mock: name이 "User Name" 으로 고정됨 */
export function isPlaceholderZaloName(name: string | undefined): boolean {
  const normalized = name?.trim().toLowerCase() ?? '';
  return !normalized || PLACEHOLDER_ZALO_NAMES.has(normalized);
}

function resolveZaloUser(user: ZaloUser): ZaloUser {
  if (!isPlaceholderZaloName(user.name)) {
    return user;
  }
  return {
    ...user,
    name: LOGGED_IN_ZALO_USER.name,
    avatar: user.avatar ?? LOGGED_IN_ZALO_USER.avatar,
  };
}

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
    const user = resolveZaloUser({
      id: String(userInfo.id),
      name: userInfo.name,
      avatar: userInfo.avatar,
    });
    saveSession(user);
    return user;
  } catch {
    const user: ZaloUser = { ...LOGGED_IN_ZALO_USER };
    saveSession(user);
    return user;
  }
}

export function getLoggedInZaloUser(): ZaloUser {
  const session = readSession();
  if (!session) return LOGGED_IN_ZALO_USER;
  return resolveZaloUser(session);
}

export function logoutZalo(): void {
  localStorage.removeItem(getZaloSessionKey());
}

export function extractSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? fullName;
}
