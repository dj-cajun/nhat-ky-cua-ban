import type { CirclePresenceMap, CirclePresencePayload } from './circle-presence.types';

function userIdFromPresenceKey(key: string): string | null {
  // Keys are `${userId}:${sessionNonce}` — UUID is 36 chars with hyphens
  const m = key.match(
    /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/,
  );
  return m?.[1] ?? null;
}

/**
 * Normalize Presence bags.
 * - Treats any payload as present-only (ignores spoofed `responded`).
 * - Prefers userId from presence key over payload.userId (anti userId spoof).
 */
export function normalizePresenceState(
  raw: Record<string, unknown[] | undefined> | CirclePresencePayload[],
): CirclePresenceMap {
  const map: CirclePresenceMap = {};

  if (Array.isArray(raw)) {
    for (const meta of raw) {
      if (!meta || typeof meta !== 'object') continue;
      const userId = typeof meta.userId === 'string' ? meta.userId : null;
      if (!userId) continue;
      if (!map[userId]) map[userId] = { userId, sessionCount: 0 };
      map[userId].sessionCount += 1;
    }
    return map;
  }

  for (const [key, arr] of Object.entries(raw)) {
    const keyUserId = userIdFromPresenceKey(key);
    for (const meta of arr ?? []) {
      if (!meta || typeof meta !== 'object') continue;
      const payload = meta as { userId?: unknown };
      const payloadUserId = typeof payload.userId === 'string' ? payload.userId : null;

      // Prefer channel key identity; drop payloads that claim a different user.
      const userId = keyUserId ?? payloadUserId;
      if (!userId) continue;
      if (keyUserId && payloadUserId && keyUserId !== payloadUserId) {
        continue;
      }

      if (!map[userId]) map[userId] = { userId, sessionCount: 0 };
      map[userId].sessionCount += 1;
    }
  }

  return map;
}

export function isPresentInMap(map: CirclePresenceMap, userId: string): boolean {
  return (map[userId]?.sessionCount ?? 0) > 0;
}
