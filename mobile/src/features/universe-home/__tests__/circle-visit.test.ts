import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: { method: string; arg?: string }[] = [];

vi.mock('expo-router', () => ({
  router: {
    push: (href: string) => calls.push({ method: 'push', arg: href }),
    replace: (href: string) => calls.push({ method: 'replace', arg: href }),
    dismissTo: (href: string) => calls.push({ method: 'dismissTo', arg: href }),
    back: () => calls.push({ method: 'back' }),
    canGoBack: () => false,
  },
}));

describe('circle-visit navigation', () => {
  beforeEach(async () => {
    calls.length = 0;
    const mod = await import('../circle-visit');
    mod.clearCircleGraph();
  });

  it('remembers circle and opens graph', async () => {
    const { openCircleGraph, peekCircleGraph } = await import('../circle-visit');
    openCircleGraph('c1');
    expect(peekCircleGraph()).toBe('c1');
    expect(calls[0]).toEqual({ method: 'push', arg: '/circles/c1/graph' });
  });

  it('opens diary with query + memory', async () => {
    const { openDiaryFromCircle, peekCircleGraph } = await import('../circle-visit');
    openDiaryFromCircle('u1', 'c1');
    expect(peekCircleGraph()).toBe('c1');
    expect(calls[0]?.arg).toContain('/diary/u1?fromCircleId=c1');
  });

  it('resolves circle id from param or memory', async () => {
    const { resolveCircleGraphId, rememberCircleGraph } = await import('../circle-visit');
    expect(resolveCircleGraphId('c9')).toBe('c9');
    rememberCircleGraph('c2');
    expect(resolveCircleGraphId(undefined)).toBe('c2');
    expect(resolveCircleGraphId(['c3'])).toBe('c3');
  });

  it('friend back goes to circle graph, not universe', async () => {
    const { rememberCircleGraph, backToCircleGraph } = await import('../circle-visit');
    rememberCircleGraph('c1');
    backToCircleGraph();
    expect(calls[0]).toEqual({ method: 'dismissTo', arg: '/circles/c1/graph' });
  });

  it('graph back clears memory and goes to universe', async () => {
    const { rememberCircleGraph, backToUniverseCircles, peekCircleGraph } =
      await import('../circle-visit');
    rememberCircleGraph('c1');
    backToUniverseCircles();
    expect(peekCircleGraph()).toBeNull();
    expect(calls[0]).toEqual({ method: 'dismissTo', arg: '/(tabs)/universe' });
  });
});
