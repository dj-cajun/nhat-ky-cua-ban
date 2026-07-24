import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { circlePresenceService } from './circle-presence.service';
import { useCirclePresenceStore } from './circle-presence.store';
import type { CirclePresenceState, RealtimeConnectionState } from './circle-presence.types';
import { getMemberBadgeFromMap } from './derive-member-badge';
import { isPresentInMap } from './normalize-presence-state';

/**
 * Subscribe to Presence for the currently open circle only.
 * Untracks on unmount, route leave, and AppState background.
 *
 * `selfResponded` / `activePostId` come from DB (or summary RPC), not from optimistic UI.
 */
export function useCirclePresence(input: {
  circleId: string | undefined;
  userId: string | null;
  isMember: boolean;
  activePostId?: string | null;
  /** True only after DB confirms this user responded to activePostId */
  selfResponded?: boolean;
}) {
  const bind = useCirclePresenceStore((s) => s.bind);
  const map = useCirclePresenceStore((s) => s.map);
  const connection = useCirclePresenceStore((s) => s.connection);
  const [ready, setReady] = useState(false);

  const activePostId = input.activePostId ?? null;
  const selfState: CirclePresenceState =
    input.selfResponded && activePostId ? 'responded' : 'present';

  useEffect(() => bind(), [bind]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!input.circleId || !input.userId) {
        await circlePresenceService.leave();
        setReady(false);
        return;
      }
      if (!input.isMember) {
        await circlePresenceService.leave();
        setReady(false);
        return;
      }
      const status = await circlePresenceService.join({
        circleId: input.circleId,
        userId: input.userId,
        isMember: input.isMember,
        activePostId,
        state: selfState,
      });
      if (!cancelled) setReady(status === 'connected');
    }
    void run();
    return () => {
      cancelled = true;
      void circlePresenceService.leave();
    };
  }, [input.circleId, input.userId, input.isMember, activePostId, selfState]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!input.circleId || !input.userId) return;
      if (state === 'background' || state === 'inactive') {
        void circlePresenceService.onAppBackground();
      } else if (state === 'active' && input.isMember) {
        void circlePresenceService.onAppForeground({
          circleId: input.circleId,
          userId: input.userId,
          isMember: true,
          activePostId,
          state: selfState,
        });
      }
    });
    return () => sub.remove();
  }, [input.circleId, input.userId, input.isMember, activePostId, selfState]);

  return {
    map,
    connection: connection as RealtimeConnectionState,
    ready,
    isPresent: (userId: string) => isPresentInMap(map, userId),
    badgeFor: (userId: string) => getMemberBadgeFromMap(map, userId, activePostId),
    trackRespondedAfterDb: (postId: string) => circlePresenceService.trackResponded(postId),
  };
}
