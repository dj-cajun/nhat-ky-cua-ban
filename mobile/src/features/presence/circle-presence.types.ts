/** Phase 5–6 — circle Presence types */

export type CirclePresenceState = 'present' | 'responded';

export type CirclePresencePayload = {
  userId: string;
  circleId: string;
  /** Current active post this session claims; null when quiet */
  activePostId: string | null;
  state: CirclePresenceState;
  sessionId: string;
};

export type CirclePresenceMap = Record<
  string,
  {
    userId: string;
    sessionCount: number;
    /** Aggregated: responded wins over present when any session matches */
    state: CirclePresenceState;
    activePostId: string | null;
  }
>;

export type RealtimeConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'forbidden'
  | 'error';

export const CIRCLE_TOPIC_RE =
  /^circle:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
