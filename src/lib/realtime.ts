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

/** Supabase Realtime 연동 (env 설정 시) */
export function initSupabaseRealtime(classId: string): (() => void) | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  // 비동기 초기화 — 실패해도 로컬 이벤트 버스로 동작
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
            emitRealtime({ type: 'new_post', message: '학교게시판에 새로운 글이 올라왔습니다.' });
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'profiles', filter: `class_id=eq.${classId}` },
          () => {
            emitRealtime({ type: 'member_joined', message: '같은반 친구가 들어왔습니다.' });
          },
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    } catch {
      // 로컬 모드 유지
    }
  })();

  return null;
}

/** 데모용 이벤트 시뮬레이션 */
export function simulateRealtimeDemo(): void {
  setTimeout(() => {
    emitRealtime({ type: 'member_joined', message: '같은반 친구가 들어왔습니다.' });
  }, 4000);
  setTimeout(() => {
    emitRealtime({ type: 'new_post', message: '학교게시판에 새로운 글이 올라왔습니다.' });
  }, 8000);
}
