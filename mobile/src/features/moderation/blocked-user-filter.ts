/**
 * Remove blocked user ids from Presence / badge maps (client-side filter).
 * Channel may still carry them; UI must not show personal presence.
 */
export function filterBlockedUserIds<T extends { userId?: string } | string>(
  items: T[],
  blockedWithMe: Set<string> | string[],
): T[] {
  const blocked =
    blockedWithMe instanceof Set ? blockedWithMe : new Set(blockedWithMe);

  return items.filter((item) => {
    const id = typeof item === 'string' ? item : item.userId;
    if (!id) return true;
    return !blocked.has(id);
  });
}

export function filterPresenceMap<T extends { sessionCount: number }>(
  map: Record<string, T>,
  blockedWithMe: Set<string> | string[],
): Record<string, T> {
  const blocked =
    blockedWithMe instanceof Set ? blockedWithMe : new Set(blockedWithMe);
  const next: Record<string, T> = {};
  for (const [userId, entry] of Object.entries(map)) {
    if (blocked.has(userId)) continue;
    next[userId] = entry;
  }
  return next;
}

export function toPublicReportStatus(
  status: string,
): 'received' | 'reviewing' | 'closed' {
  if (status === 'submitted' || status === 'received' || status === 'open') {
    return 'received';
  }
  if (status === 'reviewing') return 'reviewing';
  return 'closed';
}
