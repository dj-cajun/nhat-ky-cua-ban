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
  resolveIntroMode,
} from '../intro-policy';
import { INTRO_HANDOFF } from '../handoff';
import { consumeUniverseVisitKind, resetUniverseVisitSession } from '../session-visit';

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
  });

  it('returns full on first install', async () => {
    await expect(resolveIntroMode({ isTabReturn: false })).resolves.toBe('full');
  });

  it('returns short after seen on cold start', async () => {
    await markIntroSeen();
    await expect(resolveIntroMode({ isTabReturn: false })).resolves.toBe('short');
  });

  it('returns none on tab return unless forced', async () => {
    await markIntroSeen();
    await expect(resolveIntroMode({ isTabReturn: true })).resolves.toBe('none');
  });

  it('force replay overrides tab return', async () => {
    await markIntroSeen();
    await requestIntroReplay();
    await expect(resolveIntroMode({ isTabReturn: true })).resolves.toBe('full');
    // force flag consumed
    await expect(resolveIntroMode({ isTabReturn: true })).resolves.toBe('none');
  });
});

describe('consumeUniverseVisitKind', () => {
  beforeEach(() => {
    resetUniverseVisitSession();
  });

  it('first visit is cold, later is tab-return', () => {
    expect(consumeUniverseVisitKind()).toBe('cold');
    expect(consumeUniverseVisitKind()).toBe('tab-return');
    expect(consumeUniverseVisitKind()).toBe('tab-return');
  });
});
