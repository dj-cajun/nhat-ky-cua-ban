import { describe, expect, it } from 'vitest';
import { buildSpatialNodes, uniqueFriends } from '../spatial-members';

describe('spatial-members', () => {
  const friends = [
    { userId: 'a', displayName: 'A', circleId: 'c1' },
    { userId: 'b', displayName: 'B', circleId: 'c1' },
    { userId: 'c', displayName: 'C', circleId: 'c2' },
    { userId: 'a', displayName: 'A', circleId: 'c2' },
  ];

  it('dedupes friends by userId', () => {
    expect(uniqueFriends(friends)).toHaveLength(3);
  });

  it('never promotes non-selected friends into close tier', () => {
    const nodes = buildSpatialNodes(friends, []);
    expect(nodes.every((n) => n.tier !== 'close')).toBe(true);
  });

  it('places only manually selected close friends nearest', () => {
    const nodes = buildSpatialNodes(friends, ['b', 'c']);
    const close = nodes.filter((n) => n.tier === 'close');
    expect(close.map((n) => n.userId).sort()).toEqual(['b', 'c']);
    expect(close.every((n) => n.radius < 0.55)).toBe(true);
    const others = nodes.filter((n) => n.tier !== 'close');
    expect(others.every((n) => n.radius > 0.55)).toBe(true);
  });
});
