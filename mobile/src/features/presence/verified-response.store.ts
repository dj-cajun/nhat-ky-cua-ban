import { create } from 'zustand';
import { subscribeLocalVerifiedBus } from './verified-response.bus';
import type {
  ActivePostBadgeStates,
  CirclePostClosedEvent,
  CircleResponseVerifiedEvent,
  VerifiedResponseMap,
} from './verified-response.types';

interface VerifiedResponseStore {
  circleId: string | null;
  activePostId: string | null;
  map: VerifiedResponseMap;
  resetForCircle: (circleId: string, activePostId: string | null) => void;
  hydrateFromRpc: (states: ActivePostBadgeStates) => void;
  applyVerified: (event: CircleResponseVerifiedEvent) => void;
  applyClosed: (event: CirclePostClosedEvent) => void;
  clear: () => void;
}

export const useVerifiedResponseStore = create<VerifiedResponseStore>((set, get) => ({
  circleId: null,
  activePostId: null,
  map: {},
  resetForCircle: (circleId, activePostId) => {
    set({ circleId, activePostId, map: {} });
  },
  hydrateFromRpc: (states) => {
    const map: VerifiedResponseMap = {};
    if (states.postId) {
      for (const userId of states.respondedUserIds) {
        map[userId] = { postId: states.postId, responded: true };
      }
    }
    set({ activePostId: states.postId, map });
  },
  applyVerified: (event) => {
    const { circleId, activePostId } = get();
    if (circleId && event.circleId !== circleId) return;
    if (activePostId && event.postId !== activePostId) return;
    if (!event.responded) return;
    set((s) => ({
      map: {
        ...s.map,
        [event.userId]: { postId: event.postId, responded: true },
      },
    }));
  },
  applyClosed: (event) => {
    const { circleId, activePostId } = get();
    if (circleId && event.circleId !== circleId) return;
    if (activePostId && event.postId !== activePostId) return;
    set({ activePostId: null, map: {} });
  },
  clear: () => set({ circleId: null, activePostId: null, map: {} }),
}));

// Wire local demo outbox emissions into the store without importing Supabase.
subscribeLocalVerifiedBus((event) => {
  const state = useVerifiedResponseStore.getState();
  if (event.type === 'circle_response_verified') {
    // If circle not bound yet, still record for current post hydrate race
    if (!state.circleId) {
      useVerifiedResponseStore.setState({
        circleId: event.circleId,
        activePostId: event.postId,
        map: {
          [event.userId]: { postId: event.postId, responded: true },
        },
      });
      return;
    }
    state.applyVerified(event);
  } else {
    state.applyClosed(event);
  }
});
