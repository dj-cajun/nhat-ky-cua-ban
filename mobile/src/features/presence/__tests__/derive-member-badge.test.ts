import { describe, expect, it } from 'vitest';
import { deriveMemberBadge, getMemberBadgeFromMaps } from '../derive-member-badge';

describe('deriveMemberBadge', () => {
  it('returns null without presence', () => {
    expect(
      deriveMemberBadge({
        isPresent: false,
        activePostId: 'post-1',
        verifiedResponse: { postId: 'post-1', responded: true },
      }),
    ).toBeNull();
  });

  it('returns green when present but not verified for current post', () => {
    expect(
      deriveMemberBadge({
        isPresent: true,
        activePostId: 'post-1',
        verifiedResponse: null,
      }),
    ).toBe('green');
    expect(
      deriveMemberBadge({
        isPresent: true,
        activePostId: 'post-1',
        verifiedResponse: { postId: 'old', responded: true },
      }),
    ).toBe('green');
  });

  it('returns orange only with verified response for current post', () => {
    expect(
      deriveMemberBadge({
        isPresent: true,
        activePostId: 'post-1',
        verifiedResponse: { postId: 'post-1', responded: true },
      }),
    ).toBe('orange');
  });
});

describe('getMemberBadgeFromMaps', () => {
  it('combines presence map + verified map', () => {
    expect(
      getMemberBadgeFromMaps({
        presenceMap: { a: { sessionCount: 1 } },
        verifiedMap: { a: { postId: 'p1', responded: true } },
        userId: 'a',
        activePostId: 'p1',
      }),
    ).toBe('orange');

    expect(
      getMemberBadgeFromMaps({
        presenceMap: {},
        verifiedMap: { a: { postId: 'p1', responded: true } },
        userId: 'a',
        activePostId: 'p1',
      }),
    ).toBeNull();
  });
});
