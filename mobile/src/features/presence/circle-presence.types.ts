/** Phase 5 — circle Presence types (minimal payload) */

export type CirclePresencePayload = {
  userId: string;
  circleId: string;
  state: 'present';
  sessionId: string;
};

export type CirclePresenceMap = Record<
  string,
  {
    userId: string;
    sessionCount: number;
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
