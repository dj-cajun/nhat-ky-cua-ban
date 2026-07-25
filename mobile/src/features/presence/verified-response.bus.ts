import type {
  CirclePostClosedEvent,
  CircleResponseVerifiedEvent,
} from './verified-response.types';

export type LocalVerifiedEvent = CircleResponseVerifiedEvent | CirclePostClosedEvent;

type BusListener = (event: LocalVerifiedEvent) => void;

const listeners = new Set<BusListener>();

/** Demo outbox → in-process bus (no Supabase / RN imports). */
export function emitLocalVerifiedEvent(event: LocalVerifiedEvent): void {
  for (const l of listeners) l(event);
}

export function subscribeLocalVerifiedBus(listener: BusListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function parseVerifiedBroadcastPayload(
  raw: unknown,
): LocalVerifiedEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (p.type === 'circle_post_closed') {
    if (typeof p.circleId !== 'string' || typeof p.postId !== 'string') return null;
    return {
      type: 'circle_post_closed',
      circleId: p.circleId,
      postId: p.postId,
    };
  }
  if (p.type === 'circle_response_verified' || p.responded === true) {
    if (
      typeof p.circleId !== 'string' ||
      typeof p.postId !== 'string' ||
      typeof p.userId !== 'string'
    ) {
      return null;
    }
    return {
      type: 'circle_response_verified',
      circleId: p.circleId,
      postId: p.postId,
      userId: p.userId,
      responded: true,
    };
  }
  return null;
}
