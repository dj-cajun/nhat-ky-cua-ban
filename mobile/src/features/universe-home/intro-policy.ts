import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IntroMode } from './handoff';

const KEY_SEEN = 'your-diary-universe-intro-seen';
const KEY_FORCE = 'your-diary-universe-intro-force-once';

/** Once per JS session: intro already shown this app launch. */
let playedThisLaunch = false;

/** Local preview: `EXPO_PUBLIC_FORCE_UNIVERSE_INTRO=1` still only once per launch. */
export function isIntroForceEnv(): boolean {
  return process.env.EXPO_PUBLIC_FORCE_UNIVERSE_INTRO === '1';
}

/**
 * Intro plays once when entering the app.
 * - First install / settings replay / demo force → full (once)
 * - Same launch remount / tab return / later cold starts → none
 * - `EXPO_PUBLIC_FORCE_UNIVERSE_INTRO` → full once this launch (not every tab return)
 */
export async function resolveIntroMode(opts: {
  /** true when this focus is returning from another tab in-session */
  isTabReturn: boolean;
}): Promise<IntroMode> {
  try {
    const force = await AsyncStorage.getItem(KEY_FORCE);
    if (force === '1') {
      await AsyncStorage.removeItem(KEY_FORCE);
      playedThisLaunch = true;
      return 'full';
    }
  } catch {
    /* ignore */
  }

  // Already played (or skipped) this app launch — never again until process restart
  // (unless KEY_FORCE above).
  if (playedThisLaunch || opts.isTabReturn) {
    return 'none';
  }

  // Dev preview: one full intro this launch, then none.
  if (isIntroForceEnv()) {
    playedThisLaunch = true;
    return 'full';
  }

  try {
    const seen = await AsyncStorage.getItem(KEY_SEEN);
    if (seen !== '1') {
      playedThisLaunch = true;
      return 'full';
    }
    // Seen before: no short replay on later launches — go straight to universe.
    playedThisLaunch = true;
    return 'none';
  } catch {
    playedThisLaunch = true;
    return 'none';
  }
}

export async function markIntroSeen(): Promise<void> {
  playedThisLaunch = true;
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

/** Clear “seen” so the next resolve can treat it as first-run full intro. */
export async function clearIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_SEEN);
  } catch {
    /* ignore */
  }
}

/** Test / demo helper — allow intro again this JS session. */
export function resetIntroLaunchSession(): void {
  playedThisLaunch = false;
}
