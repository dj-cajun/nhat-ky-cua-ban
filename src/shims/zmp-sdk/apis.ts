/** Local stub — Zalo Mini App SDK 없이 브라우저에서 홈피 실행 */

export async function getUserInfo(_opts?: { avatarType?: string }) {
  return {
    userInfo: {
      id: 'local-demo',
      name: 'User Name',
      avatar: '',
    },
  };
}

export async function chooseImage(_opts?: Record<string, unknown>) {
  return { filePaths: [] as string[] };
}

export async function requestSendNotification(_opts?: Record<string, unknown>) {
  return {};
}

export async function setupAd() {
  return {};
}

export async function loadAd(_opts?: Record<string, unknown>) {
  return {};
}
