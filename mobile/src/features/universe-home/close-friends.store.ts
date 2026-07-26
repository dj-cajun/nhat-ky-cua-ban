import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'universe.closeFriendIds.v1';
export const MAX_CLOSE_FRIENDS = 3;

/**
 * Private, viewer-only close-friend picks (E3 local).
 * Never synced, never notified, never inferred from engagement.
 */
export async function getCloseFriendIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_CLOSE_FRIENDS);
  } catch {
    return [];
  }
}

export async function setCloseFriendIds(ids: string[]): Promise<string[]> {
  const next = [...new Set(ids)].slice(0, MAX_CLOSE_FRIENDS);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function addCloseFriend(userId: string): Promise<string[]> {
  const cur = await getCloseFriendIds();
  if (cur.includes(userId)) return cur;
  if (cur.length >= MAX_CLOSE_FRIENDS) return cur;
  return setCloseFriendIds([...cur, userId]);
}

export async function removeCloseFriend(userId: string): Promise<string[]> {
  const cur = await getCloseFriendIds();
  return setCloseFriendIds(cur.filter((id) => id !== userId));
}
