import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: async (k: string) => {
      store.delete(k);
    },
  },
}));

import {
  markIntroSeen,
  requestIntroReplay,
  resetIntroLaunchSession,
  resolveIntroMode,
} from '../intro-policy';
import { INTRO_HANDOFF } from '../handoff';
import {
  isUniverseTabReturn,
  markUniverseTabBlurred,
  resetUniverseVisitSession,
} from '../session-visit';

describe('INTRO_HANDOFF', () => {
  it('locks sphere ratios for video handoff', () => {
    expect(INTRO_HANDOFF.durationSec).toBe(4);
    expect(INTRO_HANDOFF.crossfadeStartSec).toBe(3.5);
    expect(INTRO_HANDOFF.sphere.cx).toBe(0.5);
    expect(INTRO_HANDOFF.sphere.diameterRatio).toBeCloseTo(0.42);
  });
});

describe('resolveIntroMode', () => {
  beforeEach(() => {
    store.clear();
    resetIntroLaunchSession();
  });

  it('returns full once when entering the app (first install)', async () => {
    await expect(resolveIntroMode({ isTabReturn: false })).resolves.toBe('full');
    // same launch — no second play
    await expect(resolveIntroMode({ isTabReturn: false })).resolves.toBe('none');
  });

  it('returns none after seen — no short cold-start replay', async () => {
    await markIntroSeen();
    resetIntroLaunchSession();
    await expect(resolveIntroMode({ isTabReturn: false })).resolves.toBe('none');
  });

  it('returns none on tab return unless forced', async () => {
    await markIntroSeen();
    resetIntroLaunchSession();
    await expect(resolveIntroMode({ isTabReturn: true })).resolves.toBe('none');
  });

  it('force replay overrides tab return once', async () => {
    await markIntroSeen();
    resetIntroLaunchSession();
    await requestIntroReplay();
    await expect(resolveIntroMode({ isTabReturn: true })).resolves.toBe('full');
    // force flag consumed + launch marked
    await expect(resolveIntroMode({ isTabReturn: true })).resolves.toBe('none');
  });

  it('EXPO_PUBLIC_FORCE_UNIVERSE_INTRO plays full once per launch only', async () => {
    await markIntroSeen();
    resetIntroLaunchSession();
    const prev = process.env.EXPO_PUBLIC_FORCE_UNIVERSE_INTRO;
    process.env.EXPO_PUBLIC_FORCE_UNIVERSE_INTRO = '1';
    try {
      await expect(resolveIntroMode({ isTabReturn: false })).resolves.toBe('full');
      await expect(resolveIntroMode({ isTabReturn: true })).resolves.toBe('none');
      await expect(resolveIntroMode({ isTabReturn: false })).resolves.toBe('none');
    } finally {
      if (prev === undefined) delete process.env.EXPO_PUBLIC_FORCE_UNIVERSE_INTRO;
      else process.env.EXPO_PUBLIC_FORCE_UNIVERSE_INTRO = prev;
    }
  });
});

describe('session visit blur flag', () => {
  beforeEach(() => {
    resetUniverseVisitSession();
  });

  it('stays cold until a real blur is marked', () => {
    expect(isUniverseTabReturn()).toBe(false);
    expect(isUniverseTabReturn()).toBe(false);
    markUniverseTabBlurred();
    expect(isUniverseTabReturn()).toBe(true);
  });
});
