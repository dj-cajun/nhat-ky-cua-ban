export interface ZaloUser {
  id: string;
  name: string;
  avatar?: string;
}

const MOCK_USER: ZaloUser = {
  id: 'zalo-mock-001',
  name: 'Nguyễn Minh Anh',
  avatar: undefined,
};

const PLACEHOLDER_NAMES = new Set(['User Name', 'User', '']);

function isValidZaloName(name: string | undefined): boolean {
  return Boolean(name && !PLACEHOLDER_NAMES.has(name));
}

/** Zalo getUserInfo — Zalo 환경 외에서는 mock fallback */
export async function getZaloUser(): Promise<ZaloUser> {
  const fetchUser = async (): Promise<ZaloUser> => {
    try {
      const { getUserInfo } = await import('zmp-sdk/apis');
      const { userInfo } = await getUserInfo({ avatarType: 'normal' });
      if (userInfo?.id && isValidZaloName(userInfo.name)) {
        return {
          id: userInfo.id,
          name: userInfo.name,
          avatar: userInfo.avatar,
        };
      }
      return MOCK_USER;
    } catch {
      return MOCK_USER;
    }
  };

  const timeout = new Promise<ZaloUser>((resolve) => {
    setTimeout(() => resolve(MOCK_USER), 1500);
  });

  return Promise.race([fetchUser(), timeout]);
}

export function extractSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? fullName;
}
