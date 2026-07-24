import type { CirclePresenceMap, CirclePresencePayload } from './circle-presence.types';

/**
 * Normalize Realtime presenceState() / local session bags.
 * Same user + multiple devices → one badge (sessionCount >= 1).
 */
export function normalizePresenceState(
  raw: Record<string, unknown[] | undefined> | CirclePresencePayload[],
): CirclePresenceMap {
  const map: CirclePresenceMap = {};

  const metas: CirclePresencePayload[] = Array.isArray(raw)
    ? raw
    : Object.values(raw).flatMap((arr) => (arr ?? []) as CirclePresencePayload[]);

  for (const meta of metas) {
    if (!meta || typeof meta !== 'object') continue;
    const userId = typeof meta.userId === 'string' ? meta.userId : null;
    if (!userId) continue;
    if (meta.state && meta.state !== 'present') continue;
    if (!map[userId]) {
      map[userId] = { userId, sessionCount: 0 };
    }
    map[userId].sessionCount += 1;
  }

  return map;
}

export function isPresentInMap(map: CirclePresenceMap, userId: string): boolean {
  return (map[userId]?.sessionCount ?? 0) > 0;
}
