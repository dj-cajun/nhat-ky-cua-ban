import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Server-driven feature flags (local cache + defaults).
 * Never hardcode kill-switches only on the client for production ops —
 * remote payload overrides defaults when available.
 */

export type FeatureFlagName =
  | 'anonymous_board_enabled'
  | 'alias_messages_enabled'
  | 'spotify_search_enabled'
  | 'realtime_badges_enabled'
  | 'circle_creation_enabled';

export type FeatureFlags = Record<FeatureFlagName, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  anonymous_board_enabled: true,
  alias_messages_enabled: true,
  spotify_search_enabled: true,
  realtime_badges_enabled: true,
  circle_creation_enabled: true,
};

const CACHE_KEY = 'your-diary:feature-flags:v1';

let memoryFlags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

export function getFeatureFlags(): FeatureFlags {
  return { ...memoryFlags };
}

export function isFeatureEnabled(name: FeatureFlagName): boolean {
  return memoryFlags[name] !== false;
}

export async function loadCachedFeatureFlags(): Promise<FeatureFlags> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
      memoryFlags = { ...DEFAULT_FEATURE_FLAGS, ...parsed };
    }
  } catch {
    memoryFlags = { ...DEFAULT_FEATURE_FLAGS };
  }
  return getFeatureFlags();
}

/** Apply remote (or ops) payload — only known keys. */
export async function applyFeatureFlags(
  remote: Partial<FeatureFlags>,
): Promise<FeatureFlags> {
  memoryFlags = { ...DEFAULT_FEATURE_FLAGS, ...memoryFlags, ...remote };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memoryFlags));
  return getFeatureFlags();
}

/**
 * Demo / local ops: flip a kill switch without an app update.
 * Production should call this after fetching from Edge / Remote Config.
 */
export async function setFeatureFlag(
  name: FeatureFlagName,
  enabled: boolean,
): Promise<FeatureFlags> {
  return applyFeatureFlags({ [name]: enabled });
}

export async function resetFeatureFlags(): Promise<FeatureFlags> {
  memoryFlags = { ...DEFAULT_FEATURE_FLAGS };
  await AsyncStorage.removeItem(CACHE_KEY);
  return getFeatureFlags();
}
