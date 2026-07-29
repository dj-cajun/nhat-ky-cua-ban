import { create } from 'zustand';
import type { CirclePresenceMap, RealtimeConnectionState } from './circle-presence.types';
import { circlePresenceService } from './circle-presence.service';

interface CirclePresenceStore {
  map: CirclePresenceMap;
  connection: RealtimeConnectionState;
  activeCircleId: string | null;
  bind: () => () => void;
  isPresent: (userId: string) => boolean;
}

export const useCirclePresenceStore = create<CirclePresenceStore>((set, get) => ({
  map: {},
  connection: 'idle',
  activeCircleId: null,
  bind: () =>
    circlePresenceService.subscribe((map, connection) => {
      set({ map, connection });
    }),
  isPresent: (userId) => (get().map[userId]?.sessionCount ?? 0) > 0,
}));
