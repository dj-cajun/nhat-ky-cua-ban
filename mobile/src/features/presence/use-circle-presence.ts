import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { listBlocks } from '@/features/local/repository';
import { filterPresenceMap } from '@/features/moderation/blocked-user-filter';
import { circlePresenceService } from './circle-presence.service';
import { useCirclePresenceStore } from './circle-presence.store';
import type { RealtimeConnectionState } from './circle-presence.types';
import { getMemberBadgeFromMaps } from './derive-member-badge';
import { isPresentInMap } from './normalize-presence-state';
import { syncVerifiedBadges } from './verified-response.service';
import { useVerifiedResponseStore } from './verified-response.store';

/**
 * Presence + verified badge sync for the open circle.
 * Blocked users are stripped from the visible presence map (no personal badges).
 */
export function useCirclePresence(input: {
  circleId: string | undefined;
  userId: string | null;
  isMember: boolean;
  activePostId?: string | null;
}) {
  const bind = useCirclePresenceStore((s) => s.bind);
  const rawMap = useCirclePresenceStore((s) => s.map);
  const connection = useCirclePresenceStore((s) => s.connection);
  const verifiedMap = useVerifiedResponseStore((s) => s.map);
  const storeActivePostId = useVerifiedResponseStore((s) => s.activePostId);
  const clearVerified = useVerifiedResponseStore((s) => s.clear);
  const [ready, setReady] = useState(false);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  const activePostId = input.activePostId ?? storeActivePostId ?? null;

  const map = useMemo(
    () => filterPresenceMap(rawMap, blockedIds),
    [rawMap, blockedIds],
  );

  const filteredVerified = useMemo(() => {
    const blocked = new Set(blockedIds);
    const next: typeof verifiedMap = {};
    for (const [uid, entry] of Object.entries(verifiedMap)) {
      if (blocked.has(uid)) continue;
      next[uid] = entry;
    }
    return next;
  }, [verifiedMap, blockedIds]);

  useEffect(() => bind(), [bind]);

  useEffect(() => {
    let cancelled = false;
    async function loadBlocks() {
      if (!input.userId) {
        setBlockedIds([]);
        return;
      }
      const mine = await listBlocks(input.userId);
      if (!cancelled) setBlockedIds(mine);
    }
    void loadBlocks();
    return () => {
      cancelled = true;
    };
  }, [input.userId, input.circleId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!input.circleId || !input.userId) {
        await circlePresenceService.leave();
        clearVerified();
        setReady(false);
        return;
      }
      if (!input.isMember) {
        await circlePresenceService.leave();
        clearVerified();
        setReady(false);
        return;
      }

      const status = await circlePresenceService.join({
        circleId: input.circleId,
        userId: input.userId,
        isMember: input.isMember,
      });

      try {
        await syncVerifiedBadges({
          circleId: input.circleId,
          viewerId: input.userId,
        });
      } catch {
        /* ignore */
      }

      if (!cancelled) setReady(status === 'connected');
    }
    void run();
    return () => {
      cancelled = true;
      void circlePresenceService.leave();
      clearVerified();
    };
  }, [input.circleId, input.userId, input.isMember, clearVerified]);

  useEffect(() => {
    if (!input.circleId || !input.userId || !input.isMember) return;
    void syncVerifiedBadges({
      circleId: input.circleId,
      viewerId: input.userId,
    });
  }, [input.activePostId, input.circleId, input.userId, input.isMember]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!input.circleId || !input.userId) return;
      if (state === 'background' || state === 'inactive') {
        void circlePresenceService.onAppBackground();
      } else if (state === 'active' && input.isMember) {
        void (async () => {
          await circlePresenceService.onAppForeground({
            circleId: input.circleId!,
            userId: input.userId!,
            isMember: true,
          });
          await syncVerifiedBadges({
            circleId: input.circleId!,
            viewerId: input.userId!,
          });
        })();
      }
    });
    return () => sub.remove();
  }, [input.circleId, input.userId, input.isMember]);

  return {
    map,
    verifiedMap: filteredVerified,
    connection: connection as RealtimeConnectionState,
    ready,
    activePostId,
    blockedIds,
    setBlockedIds,
    isPresent: (userId: string) => isPresentInMap(map, userId),
    badgeFor: (userId: string) =>
      getMemberBadgeFromMaps({
        presenceMap: map,
        verifiedMap: filteredVerified,
        userId,
        activePostId,
      }),
    resyncBadges: async () => {
      if (!input.circleId || !input.userId) return;
      await syncVerifiedBadges({
        circleId: input.circleId,
        viewerId: input.userId,
      });
    },
  };
}
