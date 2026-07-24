import { getMessages } from '@/i18n';
import { ensureRemoteAvailable, isUuid } from '@/lib/supabase-remote';

type RealtimeEvent =
  | { type: 'member_joined'; message: string }
  | { type: 'new_post'; message: string; boardType?: string }
  | { type: 'vote_nomination'; message: string; hint: string };

type Listener = (event: RealtimeEvent) => void;

const listeners = new Set<Listener>();

export function subscribeRealtime(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitRealtime(event: RealtimeEvent): void {
  listeners.forEach((l) => l(event));
}

/** Supabase Realtime — remoteClassId(UUID)가 있을 때만 구독 */
export function initSupabaseRealtime(remoteClassId: string | undefined): (() => void) | null {
  if (!remoteClassId || !isUuid(remoteClassId)) return null;

  let disposed = false;
  let removeChannel: (() => void) | null = null;

  void (async () => {
    if (!(await ensureRemoteAvailable())) return;

    try {
      const { getSupabase } = await import('@/lib/supabase');
      const supabase = getSupabase();
      if (!supabase || disposed) return;

      const channel = supabase
        .channel(`class:${remoteClassId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'posts',
            filter: `class_id=eq.${remoteClassId}`,
          },
          () => {
            emitRealtime({ type: 'new_post', message: getMessages().realtime.newSchoolPost });
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'profiles',
            filter: `class_id=eq.${remoteClassId}`,
          },
          () => {
            emitRealtime({ type: 'member_joined', message: getMessages().realtime.memberJoined });
          },
        )
        .subscribe();

      removeChannel = () => {
        void supabase.removeChannel(channel);
      };
    } catch {
      // local mode
    }
  })();

  return () => {
    disposed = true;
    removeChannel?.();
  };
}

/** Demo realtime events */
export function simulateRealtimeDemo(): void {
  setTimeout(() => {
    emitRealtime({ type: 'member_joined', message: getMessages().realtime.memberJoined });
  }, 4000);
  setTimeout(() => {
    emitRealtime({ type: 'new_post', message: getMessages().realtime.newSchoolPost });
  }, 8000);
}
