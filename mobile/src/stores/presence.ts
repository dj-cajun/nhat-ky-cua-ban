import { create } from 'zustand';

export type PresenceState = 'present' | 'responded';

interface PresenceMember {
  userId: string;
  state: PresenceState;
  sessionId: string | null;
  updatedAt: number;
}

interface PresenceStore {
  byCircle: Record<string, PresenceMember[]>;
  enter: (circleId: string, userId: string, sessionId: string | null) => void;
  markResponded: (circleId: string, userId: string, sessionId: string) => void;
  leave: (circleId: string, userId: string) => void;
  clearCircle: (circleId: string) => void;
  list: (circleId: string) => PresenceMember[];
}

/**
 * In-memory presence only (Realtime Presence in production).
 * Do not persist last_seen to DB every second.
 */
export const usePresenceStore = create<PresenceStore>((set, get) => ({
  byCircle: {},
  enter: (circleId, userId, sessionId) => {
    set((s) => {
      const current = (s.byCircle[circleId] ?? []).filter((m) => m.userId !== userId);
      current.push({
        userId,
        state: 'present',
        sessionId,
        updatedAt: Date.now(),
      });
      return { byCircle: { ...s.byCircle, [circleId]: current } };
    });
  },
  markResponded: (circleId, userId, sessionId) => {
    set((s) => {
      const current = [...(s.byCircle[circleId] ?? [])];
      const idx = current.findIndex((m) => m.userId === userId);
      if (idx >= 0) {
        current[idx] = {
          ...current[idx],
          state: 'responded',
          sessionId,
          updatedAt: Date.now(),
        };
      } else {
        current.push({ userId, state: 'responded', sessionId, updatedAt: Date.now() });
      }
      return { byCircle: { ...s.byCircle, [circleId]: current } };
    });
  },
  leave: (circleId, userId) => {
    set((s) => ({
      byCircle: {
        ...s.byCircle,
        [circleId]: (s.byCircle[circleId] ?? []).filter((m) => m.userId !== userId),
      },
    }));
  },
  clearCircle: (circleId) => {
    set((s) => {
      const next = { ...s.byCircle };
      delete next[circleId];
      return { byCircle: next };
    });
  },
  list: (circleId) => get().byCircle[circleId] ?? [],
}));
