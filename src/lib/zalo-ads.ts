/** Zalo Ads SDK (Adtima) 래퍼 — SDK 없으면 로컬 폴백 */

export interface RewardedAdResult {
  completed: boolean;
  dotoriEarned: number;
}

let adInitialized = false;

async function loadZmpAds(): Promise<{
  setupAd: () => Promise<unknown>;
  loadAd: (opts: Record<string, unknown>) => Promise<unknown>;
} | null> {
  try {
    return (await import('zmp-sdk/apis')) as {
      setupAd: () => Promise<unknown>;
      loadAd: (opts: Record<string, unknown>) => Promise<unknown>;
    };
  } catch {
    return null;
  }
}

async function ensureAds(): Promise<boolean> {
  if (adInitialized) return true;
  try {
    const apis = await loadZmpAds();
    if (!apis) return false;
    await apis.setupAd();
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

  const apis = await loadZmpAds();
  if (!apis) {
    return { completed: true, dotoriEarned: 2 };
  }

  return new Promise((resolve) => {
    let rewarded = false;
    const timeout = setTimeout(() => {
      resolve({ completed: rewarded, dotoriEarned: rewarded ? 2 : 0 });
    }, 35_000);

    void apis.loadAd({
      ids: ['ZMA_Reward'],
      config: {
        display: true,
        onClose: (token?: unknown) => {
          clearTimeout(timeout);
          if (token) rewarded = true;
          resolve({ completed: rewarded, dotoriEarned: rewarded ? 2 : 0 });
        },
        onReward: () => {
          rewarded = true;
        },
      },
    });
  });
}

export async function showInterstitialAd(): Promise<void> {
  const ready = await ensureAds();
  if (!ready) {
    await delay(300);
    return;
  }

  const apis = await loadZmpAds();
  if (!apis) {
    await delay(300);
    return;
  }

  try {
    await apis.loadAd({
      ids: ['ZMA_Fullscreen'],
      config: { display: true },
    });
    await delay(1500);
  } catch {
    await delay(300);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
