import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { circlePresenceService } from './circle-presence.service';
import { useCirclePresenceStore } from './circle-presence.store';
import type { RealtimeConnectionState } from './circle-presence.types';
import { getMemberBadgeFromMaps } from './derive-member-badge';
import { isPresentInMap } from './normalize-presence-state';
import { syncVerifiedBadges } from './verified-response.service';
import { useVerifiedResponseStore } from './verified-response.store';

/**
 * Presence + verified badge sync for the open circle.
 * Reconnect / focus → re-fetch badge states (Broadcast may have been missed).
 */
export function useCirclePresence(input: {
  circleId: string | undefined;
  userId: string | null;
  isMember: boolean;
  activePostId?: string | null;
}) {
  const bind = useCirclePresenceStore((s) => s.bind);
  const map = useCirclePresenceStore((s) => s.map);
  const connection = useCirclePresenceStore((s) => s.connection);
  const verifiedMap = useVerifiedResponseStore((s) => s.map);
  const storeActivePostId = useVerifiedResponseStore((s) => s.activePostId);
  const clearVerified = useVerifiedResponseStore((s) => s.clear);
  const [ready, setReady] = useState(false);

  const activePostId = input.activePostId ?? storeActivePostId ?? null;

  useEffect(() => bind(), [bind]);

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
        /* badge sync failure must not break presence */
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
    verifiedMap,
    connection: connection as RealtimeConnectionState,
    ready,
    activePostId,
    isPresent: (userId: string) => isPresentInMap(map, userId),
    badgeFor: (userId: string) =>
      getMemberBadgeFromMaps({
        presenceMap: map,
        verifiedMap,
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
