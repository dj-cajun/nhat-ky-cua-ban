import { useCallback, useEffect, useState } from 'react';
import { hasBlockRelation, listBlockedUserIds } from './block.service';

export function useBlockStatus(viewerId: string | null, otherUserId: string | null) {
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!viewerId || !otherUserId || viewerId === otherUserId) {
      setBlocked(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setBlocked(await hasBlockRelation(viewerId, otherUserId));
    setLoading(false);
  }, [viewerId, otherUserId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { blocked, loading, reload };
}

export function useMyBlockedUsers(viewerId: string | null) {
  const [ids, setIds] = useState<string[]>([]);

  const reload = useCallback(async () => {
    if (!viewerId) {
      setIds([]);
      return;
    }
    setIds(await listBlockedUserIds(viewerId));
  }, [viewerId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { blockedIds: ids, reload, blockedSet: new Set(ids) };
}
