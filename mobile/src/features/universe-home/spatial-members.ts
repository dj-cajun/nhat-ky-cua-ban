import type { UniverseGraphFriend } from './fallback-universe';

export type SpatialTier = 'close' | 'near' | 'distant';

export type SpatialNode = {
  userId: string;
  displayName: string;
  circleId: string;
  tier: SpatialTier;
  color: string;
  angleDeg: number;
  radius: number;
  depth?: 'front' | 'mid' | 'back';
};

const CLOSE_COLORS = ['#C97B63', '#6FA3C2', '#7FAF9A'] as const;
const NEAR_COLOR = '#9AA7B8';
const DISTANT_COLOR = '#6B7384';

const CLOSE_SLOTS: Array<{ angleDeg: number; radius: number; depth: 'front' | 'mid' | 'back' }> = [
  { angleDeg: -48, radius: 0.34, depth: 'front' },
  { angleDeg: 128, radius: 0.4, depth: 'mid' },
  { angleDeg: 52, radius: 0.46, depth: 'back' },
];

/** Stable unique friends (first circle wins). */
export function uniqueFriends(friends: UniverseGraphFriend[]): UniverseGraphFriend[] {
  const seen = new Set<string>();
  const out: UniverseGraphFriend[] = [];
  for (const f of friends) {
    if (seen.has(f.userId)) continue;
    seen.add(f.userId);
    out.push(f);
  }
  return out;
}

/**
 * Build private spatial layout.
 * Close tier = manually selected ids only (never engagement-ranked).
 */
export function buildSpatialNodes(
  friends: UniverseGraphFriend[],
  closeIds: string[],
): SpatialNode[] {
  const unique = uniqueFriends(friends);
  const closeSet = new Set(closeIds.filter((id) => unique.some((f) => f.userId === id)));
  const close = unique.filter((f) => closeSet.has(f.userId)).slice(0, 3);
  const rest = unique.filter((f) => !closeSet.has(f.userId));

  const byCircle = new Map<string, UniverseGraphFriend[]>();
  for (const f of rest) {
    const list = byCircle.get(f.circleId) ?? [];
    list.push(f);
    byCircle.set(f.circleId, list);
  }

  const nodes: SpatialNode[] = [];

  close.forEach((f, i) => {
    const slot = CLOSE_SLOTS[i] ?? CLOSE_SLOTS[CLOSE_SLOTS.length - 1]!;
    nodes.push({
      userId: f.userId,
      displayName: f.displayName,
      circleId: f.circleId,
      tier: 'close',
      color: CLOSE_COLORS[i % CLOSE_COLORS.length]!,
      angleDeg: slot.angleDeg,
      radius: slot.radius,
      depth: slot.depth,
    });
  });

  const circleIds = [...byCircle.keys()];
  circleIds.forEach((circleId, ci) => {
    const members = byCircle.get(circleId) ?? [];
    const baseAngle = -20 + ci * 95;
    members.forEach((f, mi) => {
      const isNear = mi < 1;
      nodes.push({
        userId: f.userId,
        displayName: f.displayName,
        circleId: f.circleId,
        tier: isNear ? 'near' : 'distant',
        color: isNear ? NEAR_COLOR : DISTANT_COLOR,
        angleDeg: baseAngle + mi * 18 + (isNear ? -8 : 4),
        radius: isNear ? 0.62 + mi * 0.03 : 0.84 + (mi % 4) * 0.03,
      });
    });
  });

  return nodes;
}
