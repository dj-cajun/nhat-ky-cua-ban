import { setupAd, loadAd } from 'zmp-sdk/apis';

/** Zalo Ads SDK (Adtima) 래퍼 */

export interface RewardedAdResult {
  completed: boolean;
  dotoriEarned: number;
}

let adInitialized = false;

async function ensureAds(): Promise<boolean> {
  if (adInitialized) return true;
  try {
    await setupAd();
    adInitialized = true;
    return true;
  } catch {
    return false;
  }
}

export async function showRewardedVideoAd(): Promise<RewardedAdResult> {
  const ready = await ensureAds();
  if (!ready) {
    await delay(500);
    return { completed: true, dotoriEarned: 2 };
  }

  return new Promise((resolve) => {
    let rewarded = false;
    const timeout = setTimeout(() => {
      resolve({ completed: rewarded, dotoriEarned: rewarded ? 2 : 0 });
    }, 35_000);

    void loadAd({
      ids: ['ZMA_Reward'],
      config: {
        display: true,
        onClose: (token?: unknown) => {
          clearTimeout(timeout);
          rewarded = Boolean(token) || true;
          resolve({ completed: true, dotoriEarned: 2 });
        },
      },
    }).catch(() => {
      clearTimeout(timeout);
      resolve({ completed: false, dotoriEarned: 0 });
    });
  });
}

export async function showInterstitialAd(): Promise<void> {
  const ready = await ensureAds();
  if (!ready) {
    await delay(300);
    return;
  }

  try {
    await loadAd({
      ids: ['ZMA_Fullscreen'],
      config: { display: true },
    });
    await delay(1500);
  } catch {
    await delay(300);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
