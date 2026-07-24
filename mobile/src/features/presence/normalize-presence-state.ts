import type { CirclePresenceMap, CirclePresencePayload } from './circle-presence.types';

function isPayload(meta: unknown): meta is CirclePresencePayload {
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as CirclePresencePayload;
  return typeof m.userId === 'string' && (m.state === 'present' || m.state === 'responded');
}

/**
 * Normalize Realtime presenceState() / local session bags.
 * Same user + multiple devices → one badge entry.
 * Priority: any session responded → state responded (keep that activePostId).
 */
export function normalizePresenceState(
  raw: Record<string, unknown[] | undefined> | CirclePresencePayload[],
): CirclePresenceMap {
  const map: CirclePresenceMap = {};

  const metas: CirclePresencePayload[] = Array.isArray(raw)
    ? raw.filter(isPayload)
    : Object.values(raw).flatMap((arr) => (arr ?? []).filter(isPayload));

  for (const meta of metas) {
    const userId = meta.userId;
    const activePostId =
      typeof meta.activePostId === 'string' || meta.activePostId === null
        ? meta.activePostId
        : null;

    if (!map[userId]) {
      map[userId] = {
        userId,
        sessionCount: 0,
        state: 'present',
        activePostId: null,
      };
    }

    map[userId].sessionCount += 1;

    if (meta.state === 'responded') {
      map[userId].state = 'responded';
      map[userId].activePostId = activePostId;
    } else if (map[userId].state !== 'responded') {
      map[userId].state = 'present';
      if (map[userId].activePostId == null && activePostId) {
        map[userId].activePostId = activePostId;
      }
    }
  }

  return map;
}

export function isPresentInMap(map: CirclePresenceMap, userId: string): boolean {
  return (map[userId]?.sessionCount ?? 0) > 0;
}
