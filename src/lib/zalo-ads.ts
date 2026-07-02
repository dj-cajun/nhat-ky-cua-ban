/** Zalo Ads SDK 래퍼 — 개발 환경에서는 mock */

export interface RewardedAdResult {
  completed: boolean;
  dotoriEarned: number;
}

export async function showRewardedVideoAd(): Promise<RewardedAdResult> {
  if (import.meta.env.DEV) {
    await delay(500);
    return { completed: true, dotoriEarned: 2 };
  }

  try {
    const za = (window as unknown as { za?: { createRewardedVideoAd: () => unknown } }).za;
    if (!za?.createRewardedVideoAd) {
      return { completed: false, dotoriEarned: 0 };
    }
    // 실제 SDK 연동은 T-50에서 구현
    return { completed: true, dotoriEarned: 2 };
  } catch {
    return { completed: false, dotoriEarned: 0 };
  }
}

export async function showInterstitialAd(): Promise<void> {
  if (import.meta.env.DEV) {
    await delay(300);
    return;
  }

  try {
    const za = (window as unknown as { za?: { createInterstitialAd: () => unknown } }).za;
    if (!za?.createInterstitialAd) return;
    await delay(1500);
  } catch {
    // 광고 실패 시 워프는 계속 진행
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
