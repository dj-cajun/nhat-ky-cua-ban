import type { CirclePresenceMap } from './circle-presence.types';

export type MemberBadge = 'green' | 'orange' | null;

/**
 * Badge = Presence (in the space) + response for the *current* active post.
 * No presence → no badge, even if the user responded in DB.
 */
export function getMemberBadge(
  presence:
    | {
        state: 'present' | 'responded';
        activePostId: string | null;
      }
    | null
    | undefined,
  currentPostId: string | null,
): MemberBadge {
  if (!presence) return null;

  if (
    currentPostId &&
    presence.state === 'responded' &&
    presence.activePostId === currentPostId
  ) {
    return 'orange';
  }

  return 'green';
}

/**
 * Multi-device: any session responded for current post → orange;
 * else any session present → green; else none.
 */
export function getMemberBadgeFromMap(
  map: CirclePresenceMap,
  userId: string,
  currentPostId: string | null,
): MemberBadge {
  const entry = map[userId];
  if (!entry || entry.sessionCount < 1) return null;
  return getMemberBadge(
    { state: entry.state, activePostId: entry.activePostId },
    currentPostId,
  );
}
