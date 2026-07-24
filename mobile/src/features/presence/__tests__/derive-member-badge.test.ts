import { describe, expect, it } from 'vitest';
import { getMemberBadge, getMemberBadgeFromMap } from '../derive-member-badge';
import type { CirclePresenceMap } from '../circle-presence.types';

describe('getMemberBadge', () => {
  it('returns null without presence', () => {
    expect(getMemberBadge(null, 'post-1')).toBeNull();
    expect(getMemberBadge(undefined, 'post-1')).toBeNull();
  });

  it('returns green when present but not responded for current post', () => {
    expect(
      getMemberBadge({ state: 'present', activePostId: 'post-1' }, 'post-1'),
    ).toBe('green');
    expect(
      getMemberBadge({ state: 'responded', activePostId: 'old-post' }, 'post-1'),
    ).toBe('green');
    expect(getMemberBadge({ state: 'responded', activePostId: 'post-1' }, null)).toBe(
      'green',
    );
  });

  it('returns orange only when responded for current active post', () => {
    expect(
      getMemberBadge({ state: 'responded', activePostId: 'post-1' }, 'post-1'),
    ).toBe('orange');
  });
});

describe('getMemberBadgeFromMap', () => {
  const map: CirclePresenceMap = {
    a: {
      userId: 'a',
      sessionCount: 1,
      state: 'responded',
      activePostId: 'post-1',
    },
    b: {
      userId: 'b',
      sessionCount: 2,
      state: 'present',
      activePostId: 'post-1',
    },
  };

  it('integrates multi-device map with current post id', () => {
    expect(getMemberBadgeFromMap(map, 'a', 'post-1')).toBe('orange');
    expect(getMemberBadgeFromMap(map, 'a', 'post-2')).toBe('green');
    expect(getMemberBadgeFromMap(map, 'b', 'post-1')).toBe('green');
    expect(getMemberBadgeFromMap(map, 'missing', 'post-1')).toBeNull();
  });
});
