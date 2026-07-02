import { REALTIME_MESSAGES } from '@/config/app-content';

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

/** Supabase Realtime (khi có env) */
export function initSupabaseRealtime(classId: string): (() => void) | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  void (async () => {
    try {
      const { getSupabase } = await import('@/lib/supabase');
      const supabase = getSupabase();
      if (!supabase) return;

      const channel = supabase
        .channel(`class:${classId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'posts', filter: `class_id=eq.${classId}` },
          () => {
            emitRealtime({ type: 'new_post', message: REALTIME_MESSAGES.newSchoolPost });
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'profiles', filter: `class_id=eq.${classId}` },
          () => {
            emitRealtime({ type: 'member_joined', message: REALTIME_MESSAGES.memberJoined });
          },
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    } catch {
      // local mode
    }
  })();

  return null;
}

/** Demo realtime events */
export function simulateRealtimeDemo(): void {
  setTimeout(() => {
    emitRealtime({ type: 'member_joined', message: REALTIME_MESSAGES.memberJoined });
  }, 4000);
  setTimeout(() => {
    emitRealtime({ type: 'new_post', message: REALTIME_MESSAGES.newSchoolPost });
  }, 8000);
}
