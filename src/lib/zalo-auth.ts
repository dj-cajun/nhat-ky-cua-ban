import { LOGGED_IN_ZALO_USER, type LoggedInUserConfig } from '@/config/app-content';

export type ZaloUser = LoggedInUserConfig;

/**
 * Zalo 로그인은 앱 진입 시 이미 완료된 것으로 처리합니다.
 * 실제 Zalo 연동 시에는 이 함수만 getUserInfo() 호출로 교체하면 됩니다.
 */
export function getLoggedInZaloUser(): ZaloUser {
  return LOGGED_IN_ZALO_USER;
}

/** @deprecated getLoggedInZaloUser() 사용 */
export async function getZaloUser(): Promise<ZaloUser> {
  return getLoggedInZaloUser();
}

export function extractSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? fullName;
}
