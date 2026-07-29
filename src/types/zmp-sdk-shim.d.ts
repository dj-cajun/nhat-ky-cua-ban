declare module 'zmp-sdk/apis' {
  export function getUserInfo(opts?: { avatarType?: string }): Promise<{
    userInfo: { id: string | number; name: string; avatar?: string };
  }>;
  export function chooseImage(opts?: Record<string, unknown>): Promise<{
    filePaths?: string[];
  }>;
  export function requestSendNotification(
    opts?: Record<string, unknown>,
  ): Promise<unknown>;
  export function setupAd(): Promise<unknown>;
  export function loadAd(opts: Record<string, unknown>): Promise<unknown>;
}
