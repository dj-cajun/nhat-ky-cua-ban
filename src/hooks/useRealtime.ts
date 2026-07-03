import { useEffect, useState } from 'react';
import { subscribeRealtime, simulateRealtimeDemo, initSupabaseRealtime } from '@/lib/realtime';
import { db } from '@/lib/db';
import { isRemoteEnabled } from '@/lib/supabase-remote';

export interface ToastMessage {
  id: number;
  text: string;
  type?: 'info' | 'vote';
  hint?: string;
}

let toastId = 0;

export function useRealtimeToasts(): ToastMessage[] {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const profile = db.getProfile();
    const cleanupRealtime = profile
      ? initSupabaseRealtime(profile.remoteClassId)
      : null;

    if (!isRemoteEnabled()) {
      simulateRealtimeDemo();
    }

    const unsub = subscribeRealtime((event) => {
      const id = ++toastId;
      const toast: ToastMessage = {
        id,
        text: event.message,
        type: event.type === 'vote_nomination' ? 'vote' : 'info',
        hint: event.type === 'vote_nomination' ? event.hint : undefined,
      };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    });

    return () => {
      unsub();
      cleanupRealtime?.();
    };
  }, []);

  return toasts;
}
