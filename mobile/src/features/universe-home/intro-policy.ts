import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IntroMode } from './handoff';

const KEY_SEEN = 'your-diary-universe-intro-seen';
const KEY_FORCE = 'your-diary-universe-intro-force-once';

/** First install / forced replay → full. Later cold starts → short. Tab return → none. */
export async function resolveIntroMode(opts: {
  /** true when this focus is returning from another tab in-session */
  isTabReturn: boolean;
}): Promise<IntroMode> {
  try {
    const force = await AsyncStorage.getItem(KEY_FORCE);
    if (force === '1') {
      await AsyncStorage.removeItem(KEY_FORCE);
      return 'full';
    }
  } catch {
    /* ignore */
  }

  if (opts.isTabReturn) return 'none';

  try {
    const seen = await AsyncStorage.getItem(KEY_SEEN);
    if (seen !== '1') return 'full';
    return 'short';
  } catch {
    return 'short';
  }
}

export async function markIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_SEEN, '1');
  } catch {
    /* ignore */
  }
}

export async function requestIntroReplay(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_FORCE, '1');
  } catch {
    /* ignore */
  }
}
